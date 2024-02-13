

var input = [];
keyPressed = function() {
    input[keyCode] = true;
};
keyReleased = function() {
    input[keyCode] = false;
};

/** Auxiliary Functions **/
// {

/**
 * @function boxCollide
 **/
var boxCollide = function(box1, box2) {
    return (box1.x + box1.width > box2.x && box1.x < box2.x + box2.width && box1.y + box1.height > box2.y && box1.y < box2.y + box2.height);
};

//}

/** Camera **/
// {
// Prequisites: None

/** 
 * @object_constructor Camera
 **/
var Camera = (function() {
    // Camera constructor function
    function Camera (x, y, width, height, info) {
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
    }
    
    // instance method: tracks an object's position
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
    
    // static method: selects a camera to view
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
    
    return Camera;
})();
//}

/** TileMap **/
// {

/**
 * @object_constructor Tile
 * A tile is a non-interactive static game element
 **/
var Tile = (function() {
    function Tile(config) {
        this.name = config.name;
        this.display = config.display;
        this.block = config.block || false;
    }
    
    Tile.prototype.collide = function() {
        return this.block;
    };
    
    return Tile;
})();

/** 
 * @object_constructor TileMap
 * A tilemap consists of non-interactive static game elements called tiles
**/
var TileMap = (function () {
    // TileMap constructor function
    function TileMap(config) {
        this.types = config.types || {};
    }
    
    // TileMap static method: displays all tiles
    TileMap.prototype.displayTiles = function(level) {
        for (var columnNum = 0; columnNum < level.map.length; columnNum++) {
            for (var rowNum = 0; rowNum < level.map[columnNum].length; rowNum++) {
                var tileX = rowNum * level.tileWidth;
                var tileY = columnNum * level.tileHeight;
                var tileKey = level.map[columnNum][rowNum];

                if (tileKey in this.types) {
                  var tile = this.types[tileKey];
                  tile.display(tileX, tileY, level.tileWidth, level.tileHeight);
                }
            }
        }
    };
    
    // TileMapp static method: add new tile type
    TileMap.prototype.addType = function(config) {
        this.types[config.symbol] = new Tile({name : config.name, block : config.block, display: config.display});
    };
    
    // TileMap static method: tests collision with object
    // handleCollision: function to handle collision 
    // edgesX (true/false): if true then vertical edges count for X collisions
    // edgesY (true/false): if true then horizontal edges count for Y collisions
    TileMap.prototype.testCollisions = function(level, object, handleCollision, edgesX, edgesY) {
        var leftX, rightX, topY, bottomY;
        
        if (edgesX) {
            leftX = Math.floor((object.x) / level.tileWidth);
            rightX = Math.floor((object.x + object.width) / level.tileWidth);
        } else {
            leftX = Math.floor((object.x + 1) / level.tileWidth);
            rightX = Math.floor((object.x + object.width - 1) / level.tileWidth);
        }
        
        if (edgesY) {
            topY = Math.floor((object.y) / level.tileHeight);
            bottomY = Math.floor((object.y + object.height) / level.tileHeight);
        } else {
            topY = Math.floor((object.y + 1) / level.tileHeight);
            bottomY = Math.floor((object.y + object.height - 1) / level.tileHeight);
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
            var tileKey = level.map[tile.y][tile.x];
            
            if (tileKey in this.types && this.types[tileKey].collide()) {
                handleCollision.call(object, tile.x * level.tileWidth, tile.y * level.tileHeight, level.tileWidth, level.tileHeight);
                break;
            }
        }
    };
    
    return TileMap;
})();

//}

/** Game **/
// {

// Prequisites: Camera

/**
 * @object_constructor Game
 **/
var Game = (function() {
    function Game(config) {
        // map variables
        this.levelData = config.levelData || [];
        this.mapPalette = config.mapPalette || {};
        this.tileMap = config.tileMap || {};
        this.level = 1;
        this.viewCamera = null;
        
        this.player1 = null;
        
        // physics variables
        this.airFriction = 0.1;
        this.g = 0.2;
        
        this.entities = [];
    }
    
    Game.prototype.addEntity = function (type, entity) {
        var l = this.level - 1;
        
        this.entities[l][type] = (this.entities[l].hasOwnProperty(type)) ? this.entities[l][type] : [];
        this.entities[l][type].push(entity);
    };
    
    Game.prototype.createLevel = function() {
        var l = this.level - 1,
            level = this.levelData[l];
        
        // Initialize entities array for the current level
        this.entities[l] = { };
        
        // setup camera
        level.width = level.map[0].length * level.tileWidth;
        level.height = level.map.length * level.tileHeight;
        this.viewCamera = new Camera(level.xPos, level.yPos, width, height, level);
        
        for (var columnNum = 0; columnNum < level.map.length; columnNum++) {
            for (var rowNum = 0; rowNum < level.map[columnNum].length; rowNum++) {
                var Y = columnNum * level.tileHeight;
                var X = rowNum * level.tileWidth;
                
                var symbol = level.map[columnNum][rowNum];
                // Check if the symbol exists in the mapPalette
                if (symbol in this.mapPalette) {
                    // Call the function associated with the symbol
                    this.mapPalette[symbol](X, Y, level);
                }
            }
        }
        
        // this.player1 = this.entities[l].players[0];
        // this.viewCamera = this.player1.camera;
    };
    
    Game.prototype.runLevel = function() {
        var l = this.level - 1,
            level = this.levelData[l];
        
        background(255, 255, 255);
    
        this.tileMap.displayTiles(level);
    
        // Loop through each type of object in entities
        for (var type in this.entities[l]) {
            if (this.entities[l].hasOwnProperty(type)) {
                for (var i = 0; i < this.entities[l][type].length; i++) {
                    this.entities[l][type][i].update();
                }
            }
        }

};
    
    Game.prototype.getLevel = function() {
        return this.levelData[this.level - 1];
    };
    
    return Game;
})();

//}


var game = new Game({
    levelData: [
        {
            level: 1,
            xPos: 0,
            yPos: 0,
            tileWidth: 25,
            tileHeight: 25,
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
    ],
    tileMap : new TileMap({})
});

game.tileMap.addType({
    symbol : '#',
    name: 'block',
    block: true,
    display: function(tileX, tileY, tileWidth, tileHeight) {
        fill(0);
        rect(tileX, tileY, tileWidth, tileHeight);
    }
});

game.tileMap.addType({
    symbol : 'p',
    name: 'pillar',
    block: true,
    display: function(tileX, tileY, tileWidth, tileHeight) {
        image(getImage("cute/WallBlockTall"), tileX, tileY, tileWidth, tileHeight);
    }
});

game.tileMap.addType({
    symbol: 'g',
    name: 'grass',
    block: false,
    display: function(tileX, tileY, tileWidth, tileHeight) {
        fill(21, 217, 80); // Green color for grass
        var x = tileX, y = tileY, w = tileWidth, h = tileHeight;
        var bladeWidth = w / 1; // Width of each blade of grass
    
        // Draw three blades of grass
        triangle(x + w / 2, y, x, y + h, x + w, y + h);
        triangle(x + w / 2 - bladeWidth, y, x - bladeWidth, y + h, x + w / 2 + bladeWidth, y + h);
        triangle(x + w / 2 + bladeWidth, y, x + w / 2 - bladeWidth, y + h, x + w + bladeWidth, y + h);
    }
});


/** Game Entities **/
// {

/**
 * @object_constructor Actor
 * Master class for game objects that move and interact with the environment
 **/
var Actor = (function() {
    // Actor constructor function
    function Actor(config) {
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
        this.dragForce = game.airFriction;
        
        // create a camera to track user
        this.camera = config.camera || null;
    }
    
    // accelerates an object by gravity up to a certain terminal velocity
    Actor.prototype.applyGravity = function() {
        this.yAcc = (this.yVel < this.tVel) ? game.g : 0;
    };
    
    // defines the drag force for the actor in order to apply friction against horizontal movement
    Actor.prototype.applyDrag = function() {
        this.onObject = (this.onTime++ > 5) ? false : this.onObject;
        this.dragForce = (this.onObject) ? this.dragForce : game.airFriction;
    };
    
    // identifies collision with a tile, and sends control over to handleCollision function
    // Handle X Collisions: this.collideTile(this.collideBlockTileX, true, false);
    // Handle Y Collisions: this.collideTile(this.collideBlockTileY, false, true);
    Actor.prototype.tileCollisions = function(level, handleCollision, edgesX, edgesY) {
        game.tileMap.testCollisions(level, this, handleCollision, edgesX, edgesY);
    };
    
    // handles X collisions between actor and block-tile
    Actor.prototype.handleXCollisions = function(tileX, tileY, tileWidth, tileHeight) {
        var tile = {
            x : tileX,
            y : tileY,
            width : tileWidth,
            height: tileHeight
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
    
    // handles Y collisions between actor and block-tile
    Actor.prototype.handleYCollisions = function(tileX, tileY, tileWidth, tileHeight) {
        var tile = {
            x : tileX,
            y : tileY,
            width : tileWidth,
            height: tileHeight
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
    
    // updates actor's x position based on activation inputs (activateLeft/activateRight)
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
    
    // updates actor's y position based on activation input (activateJump)
    Actor.prototype.updateY = function(activateJump) {
        if (activateJump && abs(this.yVel) < 0.1 && abs(this.yAcc) < 0.1) {
            this.yVel = -5;
        }
        
        this.applyGravity();
    
        this.y += this.yVel;
        this.yVel += this.yAcc;
};
    
    return Actor;
})();

/**
 * @object_constructor Player
 **/
var Player = (function() {
    // Player constructor function
    function Player(config) {
        Actor.call(this, config);
    }
    
    // inherit methods from Actor
    Player.prototype = Object.create(Actor.prototype);
    
    // handle x movement
    Player.prototype.moveX = function() {
        this.updateX(input[LEFT], input[RIGHT]);
    };
    
    // handle y movement
    Player.prototype.moveY = function() {
        this.updateY(input[UP]);
    };
    
    // display player
    Player.prototype.display = function() {
        fill(255, 0, 4);
        noStroke();
        rect(this.x, this.y, this.width, this.height);
    };
    
    // call player methods
    Player.prototype.update = function() {
        this.moveX();
        this.tileCollisions(game.getLevel(), this.handleXCollisions, true, false);
        
        this.moveY();
        this.tileCollisions(game.getLevel(), this.handleYCollisions, false, true);
    
    
        this.display();
        this.camera.track(this);
    };
    
    return Player;
})();

//}

game.mapPalette = {
    '@' : function(x, y, level) {
        game.addEntity('players', new Player({
            x: x,
            y: y,
            camera: new Camera(level.xPos, level.yPos, width, height, level)
        }));
    }
};

game.createLevel();

draw = function() {
    pushMatrix();
    Camera.view(game.viewCamera);
    game.runLevel();
    popMatrix();
};
