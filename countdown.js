var http = require('http').createServer(function (req,resp){
	console.log("Started");											  
});

http.listen(8080);

var io = require('socket.io').listen(http);

var util = require('util');
var twitter = require('twitter');

var users = [ ];

var timer;
var duration;
var action;
var location;
var expireAfter;
var contentVisible = false;
var twitterStreamOpen = false;

var userColors = "336600,006699,660099,FF6600,FF66CC,000000";

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
		if(users[i].userName === userName){
			return false;
		};
	}
	return true;
}

function getUsersJson(){
	var len = users.length;
	var tmp = [ ];
	var colors = userColors.split(",");
	for(var i=0;i<len;i++){
		tmp.push({userName:users[i].userName,color:colors[i]});
	}
	return tmp;
}

function handleMacro(macro,fromSocketID){
	var args = macro.split(" ");
	fromUser = getUserBySocketID(fromSocketID);
	if(args[0] == "/tell"){
		var toUser = getUserByName(args[1]);
		var msg = args.slice(2,args.length).join(" ");
		if(toUser){
			toUser.socket.emit("tell",{"from": fromUser.userName,"msg":msg});
			fromUser.socket.emit("tellSent",{"to": toUser.userName,"msg":msg});
		}
	}
}

//get rid of userNotLogged();
function getUserByName(userName){
	for(var z=0;z<users.length;z++){
		if(users[z].userName === userName){
			return users[z];
		}
	}
	return false;
}

function getUserBySocketID(socketID){
	for(var z=0;z<users.length;z++){
		if(users[z].socket.id === socketID){
			return users[z];
		}
	}
	return false;
}

function logz(msg){
	console.log("\n\nZebug: " + msg + "\n\n");
}

function handleTwitterLookup(hashtag){
	var twit = new twitter({
		consumer_key: 'KF579cDwKCfOEf1X2qOHg',
		consumer_secret: 'MwUuYeLhv7qhdVj3VQHt2SS43K4EH5AQSKGnJZP8PvY',
		access_token_key: '275320700-vXY3jDDKBXN5QaBzkQWrjRYpSfCVI41llj6ldM5M',
		access_token_secret: 'gHYxQSGObhGJ0PCUQmiqftHfvZAcyXVGQ1Z9lxtKVQIly'
	});
	twit.stream('statuses/filter', {track:'#' + hashtag}, function(stream) {
		stream.on('data', function(data) {
			if(!data.disconnect){
				io.sockets.emit("twitterStream",{text: encodeURIComponent(data.text)});
			}
		});
	});
	/*if(twit.stream){
		logz("THERE IS A STREAM");
	}*/
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
				users.push({userName:j.userName,data:null,socket:socket});
				io.sockets.emit('userJoined',{msg: "<strong>" + j.userName + "</strong> has joined the chat, yo",newUser:j.userName,users:getUsersJson()});
			}
			else{
				io.sockets.emit("userLogged",{msg: "That username is already taken"});
			}
		}
	});
	
	socket.on('chatMsg', function (data) {
		var j = JSON.parse(data);
		var msg = decodeURIComponent(j.msg);
		if(msg.indexOf("/") != 0){
			io.sockets.emit('chatMsg',j);
		}
		else{
			handleMacro(msg,socket.id);
		}
	});
	
	socket.on('hashtagLookup', function (data){
		var j = JSON.parse(data);
		handleTwitterLookup(j.hashtag);
	});
	
	socket.on('disconnect', function (data) {
		var tmp = [ ];
		for(var i = 0; i < users.length; i++){
			if(users[i].socket.id == socket.id){
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