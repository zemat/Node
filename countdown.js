var http = require('http').createServer(function (req,resp){
	console.log("Started");											  
});

http.listen(1337);

var io = require('socket.io').listen(http);

var users = [ ];
var sockets = [ ];

var timer;
var duration;
var action;
var location;
var expireAfter;
var contentVisible = false;

function SendTimerFinished(){
	if(duration === 1){
		timer.close();
		timer = setInterval(WipeContent,1000);
		contentVisible = true;
		io.sockets.emit("timeUp",{msg:MakeBroadcastHtml(),action:action});
		return
	}
	duration--;
	io.sockets.emit("currTime",{msg:duration});
}

function WipeContent(){
	if(expireAfter === 1){
		timer.close();
		timer = null;
		io.sockets.emit("wipeContent",{msg:"The time to view this content has expired",action:action});
		contentVisible = false;
		expireAfter = 300;
		return
	}
	expireAfter--;
	io.sockets.emit("currTime",{msg:expireAfter});
}

function MakeBroadcastHtml(){
	if(action === "ytv"){
		var videoID = location.substr(location.lastIndexOf("/") + 1);
		//html = '<iframe id="tempVideo" width="420" height="315" src="//www.youtube.com/embed/' + videoID + '" frameborder="0" allowfullscreen></iframe>';
		html = "<div id='tempVideo' name='tempVideo'></div>";
		json = {html:html,videoID:videoID};
	}
	return json;
}

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
	if(contentVisible == true){
		socket.emit("timeUp",{msg:MakeBroadcastHtml(),action:action});
	}
	socket.on('newTimer', function (data) {
		if(typeof data === "string"){
			var j = JSON.parse(data);
			expireAfter = 300;
			action = j.action;
			location = j.location;
			duration = j.duration;
			if(timer != null){
				timer.close();
			}
			timer = setInterval(SendTimerFinished,1000);
			io.sockets.emit("newTime",{msg:duration});
		}
	});
	socket.on('playVideo',function (data){
		if(typeof data === "string"){
			io.sockets.emit("playVideo");
		}
	});
	socket.on('stopVideo',function (data){
		if(typeof data === "string"){
			io.sockets.emit("stopVideo");
		}
	});
	
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