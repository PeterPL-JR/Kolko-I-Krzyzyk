const menuContainer = document.getElementById("menu-container");
const gameContainer = document.getElementById("game-container");

const container = document.getElementById("container");
const titleDiv = document.querySelector("h2");
const turnDiv = document.getElementById("turn");
const roundDiv = document.getElementById("round");
const endDiv = document.getElementById("end");

const singlePlayerButton = document.getElementById("single-player");
const multiPlayerButton = document.getElementById("multi-player");

const singlePlayerDiv = document.getElementById("single-player-div");
const multiPlayerDiv = document.getElementById("multi-player-div");

const singlePlayerStartButton = singlePlayerDiv.querySelector(".start-button");
const multiPlayerStartButton = multiPlayerDiv.querySelector(".start-button");

const playerNameInput = document.getElementById("player-name");
const roomCodeInput = document.getElementById("room-code");
const scoresTable = document.getElementById("scores-table");

let tableObjects = [];
const points = [0,0];
let round = 0;

let playerName1 = null;
let playerName2 = null;

const SINGLE_PLAYER = 0;
const MULTI_PLAYER = 1;

let socket = null;
let mode = null;
let admin = false;

let fields = [];
const _FIELDS = 3;

const __BLANK = -1; 
const CIRCLE = 0;
const CROSS = 1;

const symbols = [];
const names = [];

let activePlayer = CIRCLE;
let gameStarted = false;
let gameEnd = false;

const _X = 0;
const _Y = 1;

class BoardField {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.type = __BLANK;
        this.init();
    }
    init() {
        this.div = document.createElement("div");
        this.div.className = "field";

        const x = this.x;
        const y = this.y;

        this.div.onclick = function() {
            if(gameStarted && !gameEnd) {
                if(mode == MULTI_PLAYER) {
                    setFieldMultiPlayer(x, y);
                } else {
                    setField(x, y);
                }
            }
        }
        container.appendChild(this.div);
    
        if((this.y + 1) % 3 == 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "clearBoth";
            container.appendChild(emptyDiv);
        }
    }
    set(playerType) {
        this.type = playerType;
        this.div.innerHTML = symbols[playerType];
        this.div.className = "field checked";
    }
}

function initMenu() {
    gameContainer.remove();

    singlePlayerButton.onclick = initSinglePlayerMenu;
    multiPlayerButton.onclick = initMultiPlayerMenu;

    singlePlayerStartButton.onclick = initSinglePlayer;
    multiPlayerStartButton.onclick = initMultiPlayer;
}
function initGame(gameMode) {
    menuContainer.remove();
    gameContainer.style.display = "block";
    document.body.appendChild(gameContainer);

    titleDiv.innerHTML = (gameMode == MULTI_PLAYER) ? "Multiplayer" : "Singleplayer";
    mode = gameMode;

    symbols[CIRCLE] = "O";
    symbols[CROSS] = "X";

    names[CIRCLE] = "KÓŁKO";
    names[CROSS] = "KRZYŻYK";

    initScoresDivs();
    setTurnString();
    setRoundString();
    initBoard();
}

function startGame() {
    turnDiv.style.display = "block";
    gameStarted = true;
}

function initBoard() {
    for(let x = 0; x < _FIELDS; x++) {
        fields[x] = [];
        for(let y = 0; y < _FIELDS; y++) {
            fields[x][y] = new BoardField(x, y);
        }
    }
}
function initScoresDivs() {
    const scoresDivs = scoresTable.querySelectorAll(".score-div");
    for(let i = 0; i < scoresDivs.length; i++) {
        const scoreDiv = scoresDivs[i]; 
        tableObjects[i] = {
            sign: scoreDiv.querySelector(".sign"),
            player: scoreDiv.querySelector(".player"),
            score: scoreDiv.querySelector(".score"),
        };
    }
}

function initSinglePlayerMenu() {
    singlePlayerButton.className = "button-clicked";
    multiPlayerButton.className="";

    singlePlayerDiv.style.display = "block";
    multiPlayerDiv.style.display = "none";
}
function initMultiPlayerMenu() {
    singlePlayerButton.className="";
    multiPlayerButton.className = "button-clicked";    
    
    singlePlayerDiv.style.display = "none";
    multiPlayerDiv.style.display = "block";
}

const MAX_NAME_LENGTH = 20;

function initSinglePlayer() {
    const bPlayerName1 = document.getElementById("player-name-1").value;
    const bPlayerName2 = document.getElementById("player-name-2").value;

    if(!isStringEmpty(bPlayerName1) && !isStringEmpty(bPlayerName2) && bPlayerName1 != bPlayerName2 && bPlayerName1.length <= MAX_NAME_LENGTH && bPlayerName2.length <= MAX_NAME_LENGTH) {
        playerName1 = bPlayerName1;
        playerName2 = bPlayerName2;
        initGame(SINGLE_PLAYER);

        startGame();
        setupTable(playerName1, playerName2);
        setupPoints();
    }
}
function initMultiPlayer() {
    const playerName = playerNameInput.value;
    const roomCode = parseInt(roomCodeInput.value);
    scoresTable.classList.add("multiplayer-table");

    if(!isStringEmpty(playerName) && !isNaN(roomCode) && playerName.length <= MAX_NAME_LENGTH) {
        playerName1 = playerName;
        sendQuestion(roomCode, playerName);
    }
}

function startGameMultiplayer(data) {
    startGame();
    if(!admin) {
        initGame(MULTI_PLAYER);
    }

    playerName1 = data.you;
    playerName2 = data.opponent;
    yourSymbol = data.symbol;

    socket.on("set-field", function(data) {
        setField(data.x, data.y);
    });
    socket.on("reset-game", function(data) {
        yourSymbol = data.symbol;
        resetGame();
    });

    setupTable(playerName1, playerName2);
    setupPoints();

    clearInterval(interval);
}
function stopGameMultiplayer() {
    window.location.reload(false);
}

function initAdmin() {
    initGame(MULTI_PLAYER);
    admin = true;
    waitForStart();

    setupTable(playerName1, null);
    setupPoints();
}

function sendQuestion(roomCode, playerName) {
    if(socket == null) {
        socket = io();
    }
    socket.removeAllListeners("start-game");
    socket.removeAllListeners("check-room");

    socket.on("start-game", function(data) {
        startGameMultiplayer(data);
    });
    socket.on("stop-game", function() {
        stopGameMultiplayer();
    });

    const FINE = 0;
    const ERROR_GAME_STARTED = 1;
    const ERROR_NAME_NOT_UNIQUE = 2;

    socket.emit("check-room", {roomCode, playerName});
    socket.on("check-room", function(responce) {
        if(responce == FINE) {
            initAdmin();
            return;
        }
        if(responce == ERROR_GAME_STARTED) {
            roomCodeInput.value = "";
            // roomCodeInput.focus();
        }
        if(responce == ERROR_NAME_NOT_UNIQUE) {
            playerNameInput.value = "";
            // playerNameInput.focus();
        }
        resetSocket();
    });
}
function resetSocket() {
    socket.disconnect();
    socket = null;
}
function resetGame() {
    activePlayer = CIRCLE;
    gameEnd = false;
    round++;
    setTurnString();
    setRoundString();

    container.innerHTML="";
    endDiv.innerHTML="";
    endDiv.style.display = "none";
    turnDiv.style.display = "block";
    container.onclick = null;

    setupTable(playerName1, playerName2);
    initBoard();
}
function resetGameMultiPlayer() {
    socket.emit("reset-game");
}

const MAX_WAINTING_TIME = 30;
let time = MAX_WAINTING_TIME;

let interval;
let waitingDiv;

function waitForStart() {
    multiPlayerStartButton.remove();

    playerNameInput.setAttribute("readonly", "");
    roomCodeInput.setAttribute("readonly", "");

    singlePlayerButton.onclick = null;
    multiPlayerButton.onclick = null;

    singlePlayerButton.classList.add("disabled-button");
    multiPlayerButton.classList.add("disabled-button");

    interval = setInterval(function() {
        changeTime();
    }, 1000);
}
function changeTime() {
    time--;
    if(time < 0) {
        time = MAX_WAINTING_TIME;
        disconnect();
        clearInterval(interval);
    }
}
function disconnect() {
    resetSocket();
    stopGameMultiplayer();
}

function isStringEmpty(string) {
    for(let i = 0; i < string.length; i++) {
        const ch = string[i];
        if(ch != " " && ch != "\t" && ch != "\n") {
            return false;
        }
    }
    return true;
}

function setField(x, y) {
    const field = fields[x][y];
    
    if(field.type == __BLANK) {
        field.set(activePlayer);
        checkVictory();
        if(!gameEnd) checkDraw();

        if(gameEnd) {
            turnDiv.innerHTML="";
            return;
        }
        activePlayer = (activePlayer == CIRCLE ? CROSS : CIRCLE);
        
        setTurnString();
    }
}
function setFieldMultiPlayer(x, y) {
    if(fields[x][y].type == __BLANK && activePlayer == yourSymbol) {
        sendSetField(x, y);
        setField(x, y);
    }
}
function sendSetField(x, y) {
    socket.emit("set-field", {x, y, type: yourSymbol});
}

function setTurnString() {
    turnDiv.innerHTML = `Kolejka<br><span>${names[activePlayer]} (${symbols[activePlayer]})</span>`;
}

function setRoundString() {
    roundDiv.innerHTML = `Runda <span>${round + 1}</span>`;
}

function setupTable(player1Name, player2Name) {
    let adminChange = admin ? 0 : 1;
    if(mode != MULTI_PLAYER) adminChange = 0;

    tableObjects[0]['sign'].innerHTML = symbols[(round + adminChange) % 2];
    tableObjects[1]['sign'].innerHTML = symbols[(round + adminChange + 1) % 2];

    tableObjects[0]['player'].innerHTML = player1Name;
    tableObjects[1]['player'].innerHTML = player2Name;
}
function setupPoints() {
    let player1Index = 0;
    let player2Index = 1;

    if(mode == MULTI_PLAYER && !admin) {
        player1Index = 1;
        player2Index = 0;
    }

    tableObjects[0]['score'].innerHTML = points[player1Index];
    tableObjects[1]['score'].innerHTML = points[player2Index];
}

function checkVictory() {
    if(theSame([0,0], [1,1]) && theSame([1,1], [2,2])) {
        victory();
        color([fields[0][0], fields[1][1], fields[2][2]]);
        return;
    }
    if(theSame([2,0], [1,1]) && theSame([1,1], [0,2])) {
        victory();
        color([fields[2][0], fields[1][1], fields[0][2]]);
        return;
    }
    for(let i = 0; i < _FIELDS; i++) {
        const h = theSameHorizontal(i);
        const v = theSameVertical(i);
        
        if(h) {
            victory();
            color(h);
            return;
        }
        if(v) {
            victory();
            color(v);
            return;
        }
    }
}

function checkDraw() {
    for(let field of getFieldsArray2D()) {
        if(field.type == __BLANK) return;
    }
    draw();
}

function victory() {
    let victor = (round % 2 == 0) ? (activePlayer) : ((activePlayer + 1) % 2);
    points[victor]++;

    endDiv.innerHTML = `Wygrywa<br><span>${names[activePlayer]}</span>`;
    setupPoints();
    end();
}
function draw() {
    endDiv.innerHTML = "Remis!";
    end();
}

function theSame(array1, array2) {
    const field1 = fields[array1[_X]][array1[_Y]];
    const field2 = fields[array2[_X]][array2[_Y]];
    
    if(field1.type == __BLANK || field2.type == __BLANK) {
        return false;
    }
    return field1.type == field2.type;
}

function theSameHorizontal(y) {
    if(theSame([0,y], [1,y]) && theSame([1,y], [2,y])) {
        const array = [];
        for(let x = 0; x < _FIELDS; x++) {
            array.push(fields[x][y]);
        }
        return array;
    }
}
function theSameVertical(x) {
    if(theSame([x,0], [x,1]) && theSame([x,1], [x,2])) {
        return fields[x];
    }
}

function getFieldsArray2D() {
    const array = [];
    for(let x = 0; x < _FIELDS; x++) {
        for(let y = 0; y < _FIELDS; y++) {
            array.push(fields[x][y]);
        }
    }
    return array;
}

const VICTORY_BACK_COLOR = "#212121";
const VICTORY_FONT_COLOR = "white";

function color(array) {
    for(let elem of array) {
        elem.div.style.color = VICTORY_FONT_COLOR;
        elem.div.style.backgroundColor = VICTORY_BACK_COLOR;
    }
}

function end() {
    endDiv.style.display = "block";
    turnDiv.style.display = "none";

    gameEnd = true;
    for(let field of getFieldsArray2D()) {
        field.div.className = "field checked";
    }
    setTimeout(function() {
        container.onclick = (mode == MULTI_PLAYER) ? resetGameMultiPlayer : resetGame;
    }, 500);
}