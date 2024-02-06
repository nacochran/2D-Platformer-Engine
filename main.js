/** 
 * Note: This code is currently in the form of Processing.js
**/

var input = [];
keyPressed = function() {
    input[keyCode] = true;
};
keyReleased = function() {
    input[keyCode] = false;
};

/** Level Info **/
// {
var LevelMap = [
    {
        level: 1,
        xPos: 0,
        yPos: 0,
        map: [
            "########################",
            "#                      #",
            "#                      #",
            "#                      #",
            "#                      #",
            "#                      #",
            "#                      #",
            "#                      #",
            "#                      #",
            "#                      #",
            "#     @                #",
            "#                      #",
            "#                     ##",
            "#                    ###",
            "#        #     #    ####",
            "########################",
        ],
    },
];

var Level = 1, 
    l = (Level - 1);

var mapScale = 25;

// physics variables
var airFriction = 0.1;
var g = 0.2;

var viewCam;
//}

/** Auxiliary Functions **/
// {
var boxCollide = function(box1, box2) {
    return (box1.x + box1.width > box2.x && box1.x < box2.x + box2.width && box1.y + box1.height > box2.y && box1.y < box2.y + box2.height);
};

/** Camera Object Constructor **/
// {
var Camera = function(x, y, width, height, info) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.halfWidth = this.width / 2;
    this.halfHeight = this.height / 2;
    
    this.info = info;
    
    // initalize camera focus at the center of the camera lens
    this.focusXPos = this.halfWidth;
    this.focusYPos = this.halfHeight;
    
    // update speed : adjust for smoothness
    this.speed = 0.158;
    this.angle = 0;
};

Camera.prototype.track = function(object) {
    // stationary camera: camera focuses on itself
    if (typeof object === "undefined") {
        object = this;
    }
    
    // calculate center of object
    var xPos = object.x + object.width / 2;
    var yPos = object.y + object.height / 2;
    
    // calculate angle between center of camera and center of object
    this.angle = atan2(yPos - this.focusYPos, xPos - this.focusXPos);
    if (isNaN(this.angle)) {
        this.angle = 0;
        return;
    }
    
    // calculate 'update' vector to move camera
    this.distance = dist(this.focusXPos, this.focusYPos, xPos, yPos) * this.speed;
    this.focusXPos += this.distance * cos(this.angle);
    this.focusYPos += this.distance * sin(this.angle);
    
    // constrain camera by level boundaries
    this.focusXPos = constrain(this.focusXPos, this.info.xPos + this.halfWidth, this.info.width - this.halfWidth);
    this.focusYPos = constrain(this.focusYPos, this.info.yPos + this.halfHeight, this.info.height - this.halfHeight);
    
    // update camera coordinates
    this.x = -round(this.halfWidth - this.focusXPos);
    this.y = -round(this.halfHeight - this.focusYPos);
};

Camera.view = function(camera) {
    // translate based on camera's coordinates
    if (camera.info.width >= camera.width) {
        translate(-camera.x, 0);
    } else {
        translate(0, 0);
    }

    if (camera.info.height >= camera.height) {
        translate(0, -camera.y);
    } else {
        translate(0, 0);
    }
};
//}
//}

/** Game Entities **/
// {
var blocks = [];
var actors = [];

/** Actor Object Constructor **/
// { 
var Actor = function(config) {
    // position & dimensions
    this.x = config.x;
    this.y = config.y;
    this.width = config.width || 25;
    this.height = config.height || 25;
    
    // velocity 
    this.yVel = 0;
    this.yAcc = 0;
    this.xVel = 0;
    this.xAcc = 0;
    
    // terminal (free falling) velocity
    this.tVel = 8;
    // max x velocity
    this.maxXVel = 5;
    
    this.onObject = false;
    this.onTime = 0;
    
    // drag force experienced on object : defaults to air friction
    this.dragForce = airFriction;
    
    // create a camera to track user
    this.camera = config.camera || null;
};

Actor.prototype.applyGravity = function() {
    this.yAcc = (this.yVel < this.tVel) ? g : 0;
};

Actor.prototype.applyDrag = function() {
    this.onObject = (this.onTime++ > 5) ? false : this.onObject;
    this.dragForce = (this.onObject) ? this.dragForce : airFriction;
};

Actor.prototype.updateX = function(activateLeft, activateRight) {
    this.applyDrag();
    
    if (activateLeft && abs(this.xVel) < this.maxXVel) {
        this.xAcc = -0.2;
        this.xAcc -= (this.xVel > 0) ? this.dragForce/2 : 0;
    } else if (activateRight && abs(this.xVel) < this.maxXVel) {
        this.xAcc = 0.2;
        this.xAcc += (this.xVel < 0) ? this.dragForce/2 : 0;
    } else if (abs(this.xVel) > this.dragForce) {
        this.xAcc = (this.xVel < 0) ? this.dragForce : -this.dragForce;
    } else {
        this.xVel = 0;
    }
    
    this.x += this.xVel;
    this.xVel += this.xAcc;
};

Actor.prototype.updateY = function(activateJump) {
    if (activateJump && abs(this.yVel) < 0.1 && abs(this.yAcc) < 0.1) {
        this.yVel = -5;
    }
    
    this.applyGravity();

    this.y += this.yVel;
    this.yVel += this.yAcc;
};
//}

/** Player Object Constructor **/
// {
var Player = function(config) {
    Actor.call(this, config);
};

Player.prototype = Object.create(Actor.prototype);

Player.prototype.moveX = function() {
    this.updateX(input[LEFT], input[RIGHT]);
};

Player.prototype.moveY = function() {
    this.updateY(input[UP]);
};

Player.prototype.display = function() {
    fill(0, 255, 0);
    noStroke();
    rect(this.x, this.y, this.width, this.height);
};

Player.prototype.update = function() {
    this.display();
    
    this.moveX();
    for (var blockNum = 0; blockNum < blocks[l].length; blockNum++) {
        var BLOCK = blocks[l][blockNum];
        if (boxCollide(BLOCK, this.camera)) {
            blocks[l][blockNum].collideX(this);
        }
    }
    
    this.moveY();
    for (var blockNum = 0; blockNum < blocks[l].length; blockNum++) {
        var BLOCK = blocks[l][blockNum];
        if (boxCollide(BLOCK, this.camera)) {
            blocks[l][blockNum].collideY(this);
        }
    }
    
    this.camera.track(this);
};
//}

/** Block Object Constructor **/
// {
var Block = function(config) {
    this.x = config.x;
    this.y = config.y;
    this.width = config.width || 25;
    this.height = config.height || 25;
    this.friction = 0.2;
};

Block.prototype.collideX = function(object) {
    if (boxCollide(this, object)) {
        if (object.x > this.x) {
            object.x = this.x + this.width;
            object.xVel = 0;
        } else {
            object.x = this.x - object.width;
            object.xVel = 0;
        }
    }
};

Block.prototype.collideY = function(object) {
    if (boxCollide(this, object)) {
        if (object.y > this.y) {
            object.y = this.y + this.height;
            object.yVel *= -1;
        } else {
            object.y = this.y - object.height;
            object.yVel = 0;
            object.yAcc = 0;
            object.dragForce = 0.5;
            object.onObject = true;
            object.onTime = 0;
        }
    }
};

Block.prototype.display = function() {
    fill(0, 0, 0);
    noStroke();
    rect(this.x, this.y, this.width, this.height);
};
//}
//}

/** Game Engine **/
// {
var player1, viewCamera;

var CreateLevel = function() {
    // initalize empty arrays of game objects
    actors[l] = [];
    blocks[l] = [];
    
    // setup camera
    LevelMap[l].width = LevelMap[l].map[0].length * mapScale;
    LevelMap[l].height = LevelMap[l].map.length * mapScale;
    viewCam = new Camera(LevelMap[l].xPos, LevelMap[l].yPos, width, height, LevelMap[l]);
    
    for (var columnNum = 0; columnNum < LevelMap[l].map.length; columnNum++) {
        for (var rowNum = 0; rowNum < LevelMap[l].map[columnNum].length; rowNum++) {
            var Y = columnNum * mapScale;
            var X = rowNum * mapScale;
            switch (LevelMap[l].map[columnNum][rowNum]) {
                case "#":
                    blocks[l].push(new Block({
                        x: X,
                        y: Y,
                    }));
                    break;
                case "@":
                    actors[l].push(new Player({
                        x: X,
                        y: Y,
                        camera: new Camera(LevelMap[l].xPos, LevelMap[l].yPos, width, height, LevelMap[l])
                    }));
            }
        }
    }
    
    player1 = actors[l][0];
    viewCamera = player1.camera;
};

CreateLevel();

var UpdateLevel = function() {
    background(255, 255, 255);

    for (var blockNum = 0; blockNum < blocks[l].length; blockNum++) {
        var BLOCK = blocks[l][blockNum];
        if (boxCollide(BLOCK, viewCamera)) {
            BLOCK.display();
        }
    }
    
    for (var i = 0; i < actors[l].length; i++) {
        actors[l][i].update();
    }
};
//}


draw = function() {
    pushMatrix();
    Camera.view(player1.camera);
    UpdateLevel();
    popMatrix();
};



