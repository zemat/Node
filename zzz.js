var http = require('http').createServer(function (req,resp){
	//console.log(http.address.port());											  
});

var io = require('socket.io').listen(http);

var users = [ ];
var sockets = [ ];
var currTurn = 0;

var playerOne;
var playerTwo;

var winner = false;
var gameOver = false;

var totalRows = 3;
var totalCols = 3;

var players = new Array("X's","O's");

var combo = [ ];
//horizontal
combo[0] = "1,2,3";
combo[1] = "1,5,9";
combo[2] = "3,5,7";

//diagonal
combo[3] = "4,5,6";
combo[4] = "7,8,9";

//vertical
combo[5] = "1,4,7";
combo[6] = "2,5,8";
combo[7] = "3,6,9";

var turns = [ ];

function resetGame(){
	winner = false;
	gameOver = false;
	turns = [ ];
	currTurn = 0;
	playerOne = null;
	playerTwo = null;
}

function flipNewCoin(seed){
	var seed = (!seed) ? 5000 : seed;
	var num = Math.round(Math.random() * (seed - 0) + 0);
	return (num > (seed / 2)) ? 1 : 0;
}

function userNotLogged(userName){
	for(var i = 0; i < users.length; i++){
		if(users[i].userName == userName){
			return false;
		};
	}
	return true;
}

function playerWins(playerID){
	var complete = false;
	for(var i=0;i<combo.length;i++){
		var c = combo[i].split(",");
		complete = getComboCompleted(c,playerID);
		if(complete == true){
			break;
		}
	}
	return complete;
}

function getComboCompleted(combo,playerID){
	var totalFound = 0;
	for(var j=0;j<combo.length;j++){
		for(var k=0;k<turns.length;k++){
			if(turns[k].playerID == playerID){
				if(turns[k].col == "c" + combo[j]){
					totalFound++;
				}
			}
		}
	}
	if(totalFound == 3){
		return true;
	}
	else{
		return false;
	}
}

io.sockets.on('connection', function (socket) {
	socket.emit('loginMsg', { msg: 'Please supply a user name to login' });
	socket.on('login', function (data) {
		if(typeof data === "string"){
			var j = JSON.parse(data);
			if(userNotLogged(j.userName)){
				users.push({userName:j.userName,data:null,socketID:socket.id});
				if(users.length == 2){
					playerOne = users[0].userName;
					playerTwo = users[1].userName;
					currTurn = 0;//flipNewCoin();
					coinToss = (currTurn == 0) ? playerOne : playerTwo;
					gameCanStart = {
						playerOne:playerOne,
						playerTwo:playerTwo,
						nextTurn: coinToss
					}
				}
				else{
					gameCanStart = 'no';
				}
				io.sockets.emit('userJoined',{msg: "<strong>" + j.userName + "</strong> has joined the chat, yo",gameCanStart:gameCanStart});
			}
			else{
				socket.emit("userLogged",{msg: "That username is already taken"});
			}
		}
	});
	
	socket.on('chatMsg', function (data) {
		io.sockets.emit('chatMsg',JSON.parse(data));
	});
	
	socket.on('turnData', function (data) {
		data = JSON.parse(data);
		turns.push({playerID:data.userName,col:data.col,row:data.row,playerIndex:currTurn});
		var msg = false;
		if(playerWins(data.userName)){
			gameOver = "win";
			msg = data.userName + " wins";
			winner = true;
		}
		if(turns.length == 9 && winner == false){
			gameOver = "draw";
			msg = "It's a draw. Futility looms....";
		}
		currTurn = (currTurn == 0) ? 1 : 0;
		gameState = {nextTurn:currTurn,gameOver:gameOver};
		io.sockets.emit('turnData',{gameState:gameState,turns:turns,msg:msg});
	});
	
	socket.on('newGame',function(data){
		io.sockets.emit('newGame');
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
		resetGame();
		io.sockets.emit('statusMsg',{msg: loggedOffUser + " has logged off, brah"});
	});
});

http.listen(8080);