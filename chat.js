var http = require('http').createServer(function (req,resp){
	console.log("Started");											  
});

http.listen(8080);

var io = require('socket.io').listen(http);

var users = [ ];
var sockets = [ ];

function userNotLogged(userName){
	var len = users.length;
	for(var i = 0; i < len; i++){
		if(users[i].userName == userName){
			return false;
		};
	}
	return true;
}

function getUsersJson(){
	var len = users.length;
	var tmp = [ ];
	for(var i=0;i<len;i++){
		tmp.push({userName:users[i].userName});
	}
	return tmp;
}

io.sockets.on('connection', function (socket) {
	socket.emit('loginMsg', { msg: 'Please supply a user name to login' });
	socket.on('login', function (data) {
		if(typeof data === "string"){
			var j = JSON.parse(data);
			if(userNotLogged(j.userName)){
				users.push({userName:j.userName,data:null,socketID:socket.id});
				io.sockets.emit('userJoined',{msg: "<strong>" + j.userName + "</strong> has joined the chat, yo",newUser:j.userName,users:getUsersJson()});
			}
			else{
				io.sockets.emit("userLogged",{msg: "That username is already taken"});
			}
			console.log("JSON SIZE: " + users.length);
		}
	});
	
	socket.on('chatMsg', function (data) {
		io.sockets.emit('chatMsg',JSON.parse(data));
	});
	
	socket.on('keyboardDown',function(data){
		var j = JSON.parse(data);
		io.sockets.emit('keyboardDown',{userName:j.userName,keyCode:j.keyCode});
	});
	
	socket.on('keyboardUp',function(data){
		var j = JSON.parse(data);
		io.sockets.emit('keyboardUp',{userName:j.userName,keyCode:j.keyCode});
	});
	
	socket.on('disconnect', function (data) {
		var tmp = [ ];
		for(var i = 0; i < users.length; i++){
			if(users[i].socketID == socket.id){
				var loggedOffUser = users[i].userName;
			}
			else{
				tmp.push(users[i]);
			}
		}
		users = tmp;
		io.sockets.emit('disconnect',{msg: loggedOffUser + " has logged off, brah",users:getUsersJson()});
	});
});