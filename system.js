const container = document.getElementById("container");
const roundDiv = document.getElementById("round");
const endDiv = document.getElementById("end");

const fields = [];
const _FIELDS = 3;

const __BLANK = -1; 
const CIRCLE = 0
const CROSS = 1;

const symbols = [];
const names = [];

var activePlayer = CIRCLE;
var gameEnd = false;

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
        this.div.onmousedown

        const x = this.x;
        const y = this.y;

        this.div.onmousedown = function(event) {
            const LEFT_BUTTON = 0;
            if(event.button == LEFT_BUTTON) {
                if(!gameEnd) setField(x, y);
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

function init() {
    symbols[CIRCLE] = "O";
    symbols[CROSS] = "X";

    names[CIRCLE] = "KÓŁKO";
    names[CROSS] = "KRZYŻYK";

    for(var x = 0; x < _FIELDS; x++) {
        fields[x] = [];
        for(var y = 0; y < _FIELDS; y++) {
            fields[x][y] = new BoardField(x, y);
        }
    }
}

function setField(x, y) {
    const field = fields[x][y];
    
    if(field.type == __BLANK) {
        field.set(activePlayer);
        checkVictory();
        if(!gameEnd) checkDraw();

        if(gameEnd) {
            roundDiv.innerHTML="";
            return;
        }
        activePlayer = (activePlayer == CIRCLE ? CROSS : CIRCLE);
        roundDiv.innerHTML = `Kolejka<br><span>${names[activePlayer]} (${symbols[activePlayer]})</span>`
    }
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
    for(var i = 0; i < _FIELDS; i++) {
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
    for(var field of getFieldsArray2D()) {
        if(field.type == __BLANK) return;
    }
    draw();
}

function victory() {
    endDiv.innerHTML = `Wygrywa<br><span>${names[activePlayer]}</span>`;
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
        for(var x = 0; x < _FIELDS; x++) {
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
    for(var x = 0; x < _FIELDS; x++) {
        for(var y = 0; y < _FIELDS; y++) {
            array.push(fields[x][y]);
        }
    }
    return array;
}

const VICTORY_BACK_COLOR = "#212121";
const VICTORY_FONT_COLOR = "white";

function color(array) {
    for(var elem of array) {
        elem.div.style.color = VICTORY_FONT_COLOR;
        elem.div.style.backgroundColor = VICTORY_BACK_COLOR;
    }
}

function end() {
    gameEnd = true;
    for(var field of getFieldsArray2D()) {
        field.div.className = "field checked";
    }
}