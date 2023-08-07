const express = require("express");
const path = require("path");
const http = require("http");

const app = express();
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);

const PORT = process.env.PORT || 1224;

const rooms = {};

app.use(express.static(
    path.join(__dirname + "/")
));
io.on("connection", function(socket) {
    socket.on("check-room", function(data) {
        checkRoom(socket, data);
    });
    socket.on("set-field", function(data) {
        setField(socket, data);
    });
    socket.on("reset-game", function() {
        resetGame(socket.roomCode);
    });
    socket.on("disconnect", function() {
        disconnectPlayer(socket);
    });
});
server.listen(PORT, function() {
});

class Room {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.board = new Board();
        this.round = CIRCLE;

        this.player1 = null;
        this.player2 = null;
    }
    addPlayer(index, playerName, socket) {
        if(index == 0) this.player1 = new Player(playerName, socket, this.roomCode, CIRCLE);
        if(index == 1) this.player2 = new Player(playerName, socket, this.roomCode, CROSS);
    }
    resetGame() {
        this.board.reset();
        this.changeSymbols();    

        this.player1.emit("reset-game", {symbol: this.player1.symbol});
        this.player2.emit("reset-game", {symbol: this.player2.symbol});
    }
    changeSymbols() {
        this.player1.symbol = (this.player1.symbol == CIRCLE) ? CROSS : CIRCLE;
        this.player2.symbol = (this.player2.symbol == CIRCLE) ? CROSS : CIRCLE;
    }
}

class Player {
    constructor(playerName, socket, roomCode, symbol) {
        this.name = playerName;
        this.socket = socket;
        this.roomCode = roomCode;
        this.symbol = symbol;
        this.init();
    }
    init() {
        const MIN_PLAYER_CODE = 1_000_000_000_000_000;
        const MAX_PLAYER_CODE = 9_999_999_999_999_999;

        this.playerCode = getRandom(MIN_PLAYER_CODE, MAX_PLAYER_CODE);
        this.socket.playerCode = this.playerCode;
        this.socket.roomCode = this.roomCode;
        this.socket.join(this.roomCode);
    }
    emit(event, args) {
        this.socket.emit(event, args);
    }
}

const _FIELDS = 3;

const __BLANK = -1; 
const CIRCLE = 0;
const CROSS = 1;

class Board {
    constructor() {
        this.fields = [];
        this.init();
    }
    init() {
        for(let x = 0; x < _FIELDS; x++) {
            this.fields[x] = [];
            for(let y = 0; y < _FIELDS; y++) {
                this.fields[x][y] = __BLANK;
            }
        }
    }
    setField(x, y, type) {
        if(this.fields[x][y] == __BLANK) {
            this.fields[x][y] = type;
        }
    }
    reset() {
        this.fields = [];
        this.init();
    }
}

function checkRoom(socket, data) {
    const roomCode = data.roomCode;
    const playerName = data.playerName;
    const room = rooms[roomCode];

    const FINE = 0;
    const ERROR_GAME_STARTED = 1;
    const ERROR_NAME_NOT_UNIQUE = 2;

    if(room && (room.player1 != null && room.player2 != null)) {
        socket.emit("check-room", ERROR_GAME_STARTED);
        return;
    }
    if(room && (room.player1 != null && room.player2 == null)) {
        if(playerName == room.player1.name) {
            socket.emit("check-room", ERROR_NAME_NOT_UNIQUE);
            return;
        }
        room.addPlayer(1, playerName, socket);
        startGame(roomCode);
    }
    if(!room) {
        responce = true;
        createRoom(roomCode);
        rooms[roomCode].addPlayer(0, playerName, socket);
        socket.emit("check-room", FINE);
    }
}
function createRoom(roomCode) {
    rooms[roomCode] = new Room(roomCode);
}

function setField(socket, data) {
    const room = rooms[socket.roomCode];
    
    const x = data.x;
    const y = data.y;
    const type = data.type;

    room.board.setField(x, y, type);

    room.player1.emit("set-field", {x, y, type});
    room.player2.emit("set-field", {x, y, type});
}

function resetGame(roomCode) {
    rooms[roomCode].resetGame();
}

function startGame(roomCode) {
    const room = rooms[roomCode];

    const playerName1 = room.player1.name;
    const playerName2 = room.player2.name;

    room.player1.emit("start-game", {you:playerName1, opponent:playerName2, symbol:room.player1.symbol});
    room.player2.emit("start-game", {you:playerName2, opponent:playerName1, symbol:room.player2.symbol});
}

function disconnectPlayer(socket) {
    const room = rooms[socket.roomCode];
    if(room) {
        if(room.player1) room.player1.emit("stop-game");
        if(room.player2) room.player2.emit("stop-game");
    }
    delete rooms[socket.roomCode];
}

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}