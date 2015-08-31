var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bcrypt = require ('bcrypt');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var eduId;
var expId;
var ses;
var SIZE=10;
var i;
var connectionPoolArray=[];
var connectionPool=[];
var connectionPoolIdentifier=0;

function createpool() {
	for (i = 0; i < SIZE; i++) { 
		connectionPoolArray.push(mysql.createConnection({
			host     : 'localhost',
			user     : 'root',
			password : '',
			database : 'LinkedIn'
		}));
	}
}

/* GET signup page. */
router.get('/', function(req, res) {
  res.render('home');
});

/*var pool      =    mysql.createPool({
    connectionLimit : 100, 
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'LinkedIn',
    debug    :  false,
});*/


function FreeConnections(){
	if(connectionPool.length<SIZE)
	{
		return true;
	}
	else
	{
		return false;
	}
}

function getConnection(res,sqlQuery){
	if(new FreeConnections()===true)
	{
		var size=connectionPool.push(connectionPoolArray.pop());
		var poolconnection=connectionPool[size-1];
		poolconnection.query(sqlQuery, function(err, results) {
			if(err){
				console.log("ERROR: " + err.message);
			}
			else 
			{	
				res(err, results);
			}
		});
		connectionPoolArray.push(connectionPool.pop());
		poolconnection.end();
	}
	else{
		console.log('Cannot access');
	}	
}	

/*Added*/
function getPoolConnection(){
	var connection = mysql.createConnection({
		host     : 'localhost',
		user     : 'root',
		password : '',
		database : 'LinkedIn'
	});
	return connection;
}


/*function handle_database(res,sqlQuery){

	console.log("\nSQL Query::"+sqlQuery);

	var connection=getPoolConnection();

	connection.query(sqlQuery, function(err, results) {
		if(err){
			console.log("ERROR: " + err.message);
		}
		else 
		{	
			res(err, results);
		}
	});
	console.log("\nConnection closed..");
	connection.end();
}	
*/
function handle_database(res,sqlQuery) {
var connection = mysql.createConnection({
	host : 'localhost',
	user : 'root', 
	database : 'LinkedIn',
	password : ''
});
	connection.connect();
	connection.query(sqlQuery, function(err,rows) {
		if (err) {
			throw err;
		}
		else{
			res(err,rows);
		}
	});
	connection.end();
}
    
/*function handle_database(res,sqlQuery) {
    
    pool.getConnection(function(err,connection){
        if (err) {
          connection.release();
          res(err,({"code" : 100, "status" : "Error in connection database"}));
          return;
        }   

        console.log('connected as id ' + connection.threadId);
        connection.query(sqlQuery, function(err, rows){
        	//console.log("hi1");
            connection.release();
            if(!err) {
            	//console.log("hi2");
            	console.log(rows);
            	res(err,rows);
            	//console.log("hi3");
            }  
            else{
            	console.log(err);
            }
        });
        connection.on('error', function(err) {      
              res.send({"code" : 100, "status" : "Error in connection database"});
              return;     
        });
        
       pool.on('connection', function (connection) {
        	  connection.query('SET SESSION auto_increment_increment=1');
        	});
       pool.on('enqueue', function () {
    	   console.log('Waiting for available connection slot');
    	 });
  });
}*/

router.post('/aftersignup', function(req, res) {
	
	var sqlFindUser = "select * from USER where username='"+req.body.username+"'";
	console.log("Query is:"+sqlFindUser);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User alreasy exists");
				res.send({"signup":"Fail"});
			}
			else {    
				console.log("New user");
				bcrypt.genSalt(10, function(err, salt) {
				    bcrypt.hash(req.body.password, salt, function(err, hash) {
				    	var date= new Date(Date.now());
				    	var sqlNewUser = "insert into USER (firstName,lastName,username,password,lastLoggedIn) values ('"+req.body.firstname+"','"+req.body.lastname+"','"+req.body.username+"','"+hash+"','"+date+"')";
						console.log("Query is:"+sqlNewUser);
						
						handle_database(function(err,results){
							console.log("inside");
							if(err){
								console.log("error");
								throw err;
							}
							ses=req.session;
				    		ses.username=req.body.username;
				    		console.log(ses.username + "is session username");
						res.send({"signup":"Success"});
						},sqlNewUser);
				    	});
					});
				console.log("User added");
				}
		}
	},sqlFindUser);
});

router.post('/afterlogin', function(req, res) {
	var sqlFindUser = "select * from USER where username='"+req.body.username+"'";
	console.log("Query is:"+sqlFindUser);
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else{
			console.log(results);
			if(results.length > 0){
				var sqlGetPassword = "select password from USER where username='"+req.body.username+"'";
				console.log("Query is:"+sqlGetPassword);
				
				handle_database(function(err,results){
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("results"+results);
						
						 bcrypt.compare(req.body.password, results[0].password, function(err, response) {
						    	console.log("output is " +response);
						    	if(response){
						    		ses=req.session;
						    		ses.username=req.body.username;
						    		var getUserById="select userId from USER where username='"+req.body.username+"'";
						    		handle_database(function(err,results){
										console.log("inside");
										if(err){
											console.log("error");
											throw err;
										}
										else{
											var date= new Date(Date.now());
											var updateLastLogin="UPDATE USER SET lastLoggedIn='"+date+"' WHERE userId='"+results[0].userId+"'";
											handle_database(function(err,results){
												console.log("inside");
												if(err){
													console.log("error");
													throw err;
												}
												else{
										    		console.log("Valid user");
										    		res.send({"login":"Success"});
												}
											},updateLastLogin);
										}
									},getUserById);
						    	}
						    	else{
						    		console.log("InValid user");
									res.send({"login":"Fail"});
						    	}
						    });
					}
				},sqlGetPassword);		
			}
			else {  
				console.log("InValid user");
				res.send({"login":"Fail"});
			}
		}
	},sqlFindUser);
});

router.get('/logout', function(req, res){
	console.log(req.session.username);
	  req.session.destroy(function(err){
		  if(err){
			  console.log(err);
		  }
		  else{
			  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'); 
			  res.redirect('/login');
		  }
		  
	  });
	});

router.get('/home', function(req, res) {
	  res.render('home');
	});

router.get('/profile', function(req, res) {
	ses=req.session;
	if(ses.username){
		console.log(ses.username);
	  res.render('profile');
	  }
	else{
		res.render('home');
	}
	});

router.get('/login', function(req, res) {
	  res.render('login');
	});

router.get('/signup', function(req, res) {
	  res.render('signup');
	});

router.get('/Connection', function(req, res) {
	  res.render('Connection');
	});

router.get('/editprofile', function(req, res) {
	ses=req.session;
	if(ses.username){
		console.log(ses.username);
	  res.render('editprofile');
	  }
	else{
		res.render('home');
	}
	});

router.post('/editExperience', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlinsertIntoExp = "Update USER_EXPERIENCE set companyName='"+req.body.company+"',title='"+req.body.title+"',location='"+req.body.location+"',description='"+req.body.description+"' WHERE userId='"+results[0].userId+"' and expId='"+expId+"'";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("Exp dat inserted");
						res.send({"exp":"Success"});
					}
				},sqlinsertIntoExp);
			}
			else{
				console.log("InValid user");
				res.send({"exp":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.post('/editEducation', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlinsertIntoEdu = "Update USER_EDUCATION set school='"+req.body.school+"',degree='"+req.body.degree+"',fieldOfStudy='"+req.body.fieldOfStudy+"',grade='"+req.body.grade+"',activities='"+req.body.activities+"',descriptionEdu='"+req.body.description+"' WHERE userId='"+results[0].userId+"' and eduId='"+eduId+"'";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("Edu data inserted");
						res.send({"edu":"Success"});
					}
				},sqlinsertIntoEdu);
			}
			else{
				console.log("InValid user");
				res.send({"edu":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.post('/saveExperience', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlinsertIntoExp = "Insert into USER_EXPERIENCE (userId,companyName,title,location,description) values ('"+results[0].userId+"','"+req.body.company+"','"+req.body.title+"','"+req.body.location+"','"+req.body.description+"')";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("Exp dat inserted");
						res.send({"exp":"Success"});
					}
				},sqlinsertIntoExp);
			}
			else{
				console.log("InValid user");
				res.send({"exp":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.post('/saveEducation', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlinsertIntoEdu = "Insert into USER_EDUCATION (userId,school,degree,fieldOfStudy,grade,activities,descriptionEdu) values ('"+results[0].userId+"','"+req.body.school+"','"+req.body.degree+"','"+req.body.fieldOfStudy+"','"+req.body.grade+"','"+req.body.activities+"','"+req.body.description+"')";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("Edu data inserted");
						res.send({"edu":"Success"});
					}
				},sqlinsertIntoEdu);
			}
			else{
				console.log("InValid user");
				res.send({"edu":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.post('/saveSummary', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlinsertIntoSum = "Update USER set summary='"+req.body.summary+"' WHERE userId='"+results[0].userId+"'";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("sum data inserted");
						res.send({"sum":"Success"});
					}
				},sqlinsertIntoSum);
			}
			else{
				console.log("InValid user");
				res.send({"sum":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.post('/saveSkill', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlinsertIntoSkill = "Update USER set skills='"+req.body.skill+"' WHERE userId='"+results[0].userId+"'";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("skil data inserted");
						res.send({"skill":"Success"});
					}
				},sqlinsertIntoSkill);
			}
			else{
				console.log("InValid user");
				res.send({"skill":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.get('/getExp', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlGetExp = "select Max(expId) as expId,companyName,title,location,description from USER_EXPERIENCE WHERE userId='"+results[0].userId+"' and expId=(select max(expId) from USER_EXPERIENCE WHERE userId='"+results[0].userId+"')";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						expId=results[0].expId;
						console.log("exp data fetched");
						res.send(results);
					}
				},sqlGetExp);
			}
			else{
				console.log("InValid user");
				res.send({"exp":"Fail"});
			}
		}
	},sqlFindUserId);
	});
router.get('/getEdu', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlGetEdu = "select Max(eduId) as eduId,school,degreeDesc,degree,fieldOfStudy,grade,activities,descriptionEdu from DEGREE_LIST AS d INNER JOIN USER_EDUCATION AS u ON d.degreeId=u.degree and u.userId ='"+results[0].userId+"' and eduId=(select max(eduId) from USER_EDUCATION WHERE userId='"+results[0].userId+"')";
				//var sqlGetEdu = "select Max(eduId) as eduId,school,degree,fieldOfStudy,grade,activities,descriptionEdu from USER_EDUCATION where userId ='"+results[0].userId+"' and eduId=(select max(eduId) from USER_EDUCATION WHERE userId='"+results[0].userId+"')";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						eduId=results[0].eduId;
						console.log("edu data fetched");
						res.send(results);
					}
				},sqlGetEdu);
			}
			else{
				console.log("InValid user");
				res.send({"edu":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.get('/getdegree', function(req, res) {
	var sqlGetDegree = "select * from DEGREE_LIST"; 
	console.log(sqlGetDegree);
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log(sqlGetDegree);
				res.send(results);
				}
		}
	},sqlGetDegree);
});

router.get('/getSum', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlGetExp = "select summary from USER WHERE userId='"+results[0].userId+"'";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("sum data fetched");
						res.send(results);
					}
				},sqlGetExp);
			}
			else{
				console.log("InValid user");
				res.send({"sum":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.get('/getTime', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlGetExp = "select lastLoggedIn from USER WHERE userId='"+results[0].userId+"'";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("time data fetched");
						res.send(results);
					}
				},sqlGetExp);
			}
			else{
				console.log("InValid user");
				res.send({"time":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.get('/getSkills', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlGetskill = "select skills from USER WHERE userId='"+results[0].userId+"'";
				handle_database(function(err,results){
					
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("skill data fetched");
						res.send(results);
					}
				},sqlGetskill);
			}
			else{
				console.log("InValid user");
				res.send({"skill":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.post('/showConnections',function(req,res){
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlGetConnections="Call DisplayLinkedConnections('"+req.session.username+"')";
				handle_database(function(err,results){	
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("total :"+JSON.stringify(results));
						res.send(results);
					}
				},sqlGetConnections);
			}
			else{
				console.log("InValid user");
				res.send({"conn":"Fail"});
			}
		}
	},sqlFindUserId);
});

router.get('/addconnection', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlGetConnections="Call DisplayLinkedConnections('"+req.session.username+"')";
				handle_database(function(err,results){	
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("total :"+JSON.stringify(results));
						res.send(results);
					}
				},sqlGetConnections);
			}
			else{
				console.log("InValid user");
				res.send({"conn":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.get('/acceptconnection', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlGetConnections="Call DisplayLinkedConnections('"+req.session.username+"')";
				handle_database(function(err,results){	
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("total :"+JSON.stringify(results));
						res.send(results);
					}
				},sqlGetConnections);
			}
			else{
				console.log("InValid user");
				res.send({"conn":"Fail"});
			}
		}
	},sqlFindUserId);
	});

router.get('/ignoreconnection', function(req, res) {
	var sqlFindUserId = "select userId from USER where username='"+req.session.username+"'"; 
	console.log("Query is:"+sqlFindUserId);
	
	handle_database(function(err,results){
		if(err){
			console.log("error");
			throw err;
		}
		else 
		{
			if(results.length > 0){
				console.log("User exists");
				var sqlGetConnections="Call DisplayLinkedConnections('"+req.session.username+"')";
				handle_database(function(err,results){	
					if(err){
						console.log("error");
						throw err;
					}
					else{
						console.log("total :"+JSON.stringify(results));
						res.send(results);
					}
				},sqlGetConnections);
			}
			else{
				console.log("InValid user");
				res.send({"conn":"Fail"});
			}
		}
	},sqlFindUserId);
	});
module.exports = router;
module.exports.getConnection=getConnection;
module.exports.createpool=createpool;
module.exports.handle_database=handle_database;