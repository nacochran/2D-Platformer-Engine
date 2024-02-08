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
        tileWidth: 25, // Width of each tile
        tileHeight: 25, // Height of each tile
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
            "#   # @                #",
            "#   #                  #",
            "#  #####              ##",
            "#                    ###",
            "#  gggg   ppp  #    ####",
            "########################",
        ],
    },
];

var Level = 1, 
    l = (Level - 1);

// physics variables
var airFriction = 0.1;
var g = 0.2;

var viewCam;
//}

/** Auxiliary Functions **/
// {
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
// static items that do not move
var tileTypes = [];

var Tile = (function () {
    function Tile(config) {
        this.name = config.name;
        this.symbol = config.symbol;
        this.display = config.display;
        this.block = config.block || false;
    }
    
    Tile.prototype.run = function() {
        for (var columnNum = 0; columnNum < LevelMap[l].map.length; columnNum++) {
            for (var rowNum = 0; rowNum < LevelMap[l].map[columnNum].length; rowNum++) {
                var tileX = rowNum * LevelMap[l].tileWidth;
                var tileY = columnNum * LevelMap[l].tileHeight;
                if (LevelMap[l].map[columnNum][rowNum] === this.symbol) {
                    this.display(tileX, tileY);
                }
            }
        }
    };
    
    Tile.prototype.collide = function(tileX, tileY) {
        return (LevelMap[l].map[tileY][tileX] === this.symbol && this.block);
    };
    
    return Tile;
})();

// Block Tile Type
tileTypes.push(new Tile({
    name: 'block',
    symbol: '#',
    block: true,
    display: function(tileX, tileY) {
        fill(0);
        rect(tileX, tileY, LevelMap[l].tileWidth, LevelMap[l].tileHeight);
    }
}));

// Block Tile Type 2
tileTypes.push(new Tile({
    name: 'pillar',
    symbol: 'p',
    block: true,
    display: function(tileX, tileY) {
         image(getImage("cute/WallBlockTall"), tileX, tileY, LevelMap[l].tileWidth, LevelMap[l].tileHeight);
    }
}));

// Grass Tile Type
tileTypes.push(new Tile({
    name: 'grass',
    symbol: 'g',
    block: false,
    display: function(tileX, tileY) {
        fill(21, 217, 80); // Green color for grass
        var x = tileX, y = tileY, w = LevelMap[l].tileWidth, h = LevelMap[l].tileHeight;
        var bladeWidth = w / 1; // Width of each blade of grass
    
        // Draw three blades of grass
        triangle(x + w / 2, y, x, y + h, x + w, y + h);
        triangle(x + w / 2 - bladeWidth, y, x - bladeWidth, y + h, x + w / 2 + bladeWidth, y + h);
        triangle(x + w / 2 + bladeWidth, y, x + w / 2 - bladeWidth, y + h, x + w + bladeWidth, y + h);
    }
}));

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

Actor.prototype.collideTile = function(handleCollision, edgesX, edgesY) {
    var leftX, rightX, topY, bottomY;
    
    if (edgesX) {
        leftX = Math.floor((this.x) / LevelMap[l].tileWidth);
        rightX = Math.floor((this.x + this.width) / LevelMap[l].tileWidth);
    } else {
        leftX = Math.floor((this.x + 1) / LevelMap[l].tileWidth);
        rightX = Math.floor((this.x + this.width - 1) / LevelMap[l].tileWidth);
    }
    
    if (edgesY) {
        topY = Math.floor((this.y) / LevelMap[l].tileHeight);
        bottomY = Math.floor((this.y + this.height) / LevelMap[l].tileHeight);
    } else {
        topY = Math.floor((this.y + 1) / LevelMap[l].tileHeight);
        bottomY = Math.floor((this.y + this.height - 1) / LevelMap[l].tileHeight);
    }

    // Array to hold the four tile coordinates
    var tilesToCheck = [
        {x: leftX, y: topY},
        {x: leftX, y: bottomY},
        {x: rightX, y: topY},
        {x: rightX, y: bottomY}
    ];

    // Loop through each tile coordinate and check for collision
    for (var i = 0; i < tilesToCheck.length; i++) {
        var tile = tilesToCheck[i];
        for (var j = 0; j < tileTypes.length; j++) {
            var tileType = tileTypes[j];
            if (tileType.collide(tile.x, tile.y)) {
                handleCollision.call(this, tile.x * LevelMap[l].tileWidth, tile.y * LevelMap[l].tileHeight);
                break;
            }
        }
    }
};

Actor.prototype.collideBlockTileX = function(tileX, tileY) {
    var tile = {
        x : tileX,
        y : tileY,
        width : LevelMap[l].tileWidth,
        height: LevelMap[l].tileHeight
    };
    
    // println('X Collision:');
    // println("x: " + tile.x + ", y: " + tile.y + ", width: " + tile.width + ", height: " + tile.height);
    // stroke(255, 0, 0);
    // strokeWeight(1);
    // noFill();
    // rect(tile.x, tile.y, tile.width, tile.height);
    // noLoop();
    
    if (this.x > tile.x && this.xVel < 0) {
        this.x = tile.x + tile.width;
        this.xVel = 0;
    } else if (this.x < tile.x && this.xVel > 0) {
        this.x = tile.x - this.width;
        this.xVel = 0;
    }
};

Actor.prototype.collideBlockTileY = function(tileX, tileY) {
    var tile = {
        x : tileX,
        y : tileY,
        width : LevelMap[l].tileWidth,
        height: LevelMap[l].tileHeight
    };
    
    // println('Y Collision:');
    // println("x: " + tile.x + ", y: " + tile.y + ", width: " + tile.width + ", height: " + tile.height);
    // stroke(255, 0, 0);
    // strokeWeight(1);
    // noFill();
    // rect(tile.x, tile.y, tile.width, tile.height);
    
    
    if (this.y > tile.y && this.yVel < 0) {
        this.y = tile.y + tile.height;
        this.yVel *= -1;
    } else if (this.y < tile.y) {
        this.y = tile.y - this.height;
        this.yVel = 0;
        this.yAcc = 0;
        this.dragForce = 0.5;
        this.onObject = true;
        this.onTime = 0;
    }
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
    fill(255, 0, 4);
    noStroke();
    rect(this.x, this.y, this.width, this.height);
};

Player.prototype.update = function() {
    this.moveX();
    this.collideTile(this.collideBlockTileX, true, false);
    
    this.moveY();
    this.collideTile(this.collideBlockTileY, false, true);


    this.display();
    this.camera.track(this);
};

//}

//}

/** Game Engine **/
// {
var player1, viewCamera;

var CreateLevel = function() {
    // Initialize actors array for the current level
    actors[l] = [];
    
    // setup camera
    LevelMap[l].width = LevelMap[l].map[0].length * LevelMap[l].tileWidth;
    LevelMap[l].height = LevelMap[l].map.length * LevelMap[l].tileHeight;
    viewCam = new Camera(LevelMap[l].xPos, LevelMap[l].yPos, width, height, LevelMap[l]);
    
    for (var columnNum = 0; columnNum < LevelMap[l].map.length; columnNum++) {
        for (var rowNum = 0; rowNum < LevelMap[l].map[columnNum].length; rowNum++) {
            var Y = columnNum * LevelMap[l].tileHeight;
            var X = rowNum * LevelMap[l].tileWidth;
            switch (LevelMap[l].map[columnNum][rowNum]) {
                case "#":
                    // Instead of creating blocks, we handle collision with tiles directly in Player's update method
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

    for (var i = 0; i < tileTypes.length; i++) {
        tileTypes[i].run();
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
