

var input = [];
keyPressed = function() {
    input[keyCode] = true;
};
keyReleased = function() {
    input[keyCode] = false;
};

/** Level Info **/
// {
var levelData = [
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

/**
 * @function boxCollide
 **/
var boxCollide = function(box1, box2) {
    return (box1.x + box1.width > box2.x && box1.x < box2.x + box2.width && box1.y + box1.height > box2.y && box1.y < box2.y + box2.height);
};

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

/** Game Entities **/
// {

/** 
 * @object_constructor TileMap
 * A tilemap consists of non-interactive static game elements called tiles
**/
var TileMap = (function () {
    // TileMap constructor function
    function TileMap(config) {
        this.name = config.name;
        this.display = config.display;
        this.block = config.block || false;
    }
    
    // TileMap static method: displays all tiles
    TileMap.displayTiles = function() {
        for (var columnNum = 0; columnNum < levelData[l].map.length; columnNum++) {
            for (var rowNum = 0; rowNum < levelData[l].map[columnNum].length; rowNum++) {
                var tileX = rowNum * levelData[l].tileWidth;
                var tileY = columnNum * levelData[l].tileHeight;
                var tileKey = levelData[l].map[columnNum][rowNum];

                if (tileKey in TileMap.types) {
                  var tile = TileMap.types[tileKey];
                  tile.display(tileX, tileY);
                }
            }
        }
    };
    
    // TileMap hash storing tile types
    TileMap.types = {};
    
    // TileMapp static method: add new tile type
    TileMap.addType = function(config) {
        return new TileMap({name : config.name, block : config.block, display: config.display});
    };
    
    // TileMap static method: tests collision with object
    // handleCollision: function to handle collision 
    // edgesX (true/false): if true then vertical edges count for X collisions
    // edgesY (true/false): if true then horizontal edges count for Y collisions
    TileMap.testCollisions = function(object, handleCollision, edgesX, edgesY) {
        var leftX, rightX, topY, bottomY;
        
        if (edgesX) {
            leftX = Math.floor((object.x) / levelData[l].tileWidth);
            rightX = Math.floor((object.x + object.width) / levelData[l].tileWidth);
        } else {
            leftX = Math.floor((object.x + 1) / levelData[l].tileWidth);
            rightX = Math.floor((object.x + object.width - 1) / levelData[l].tileWidth);
        }
        
        if (edgesY) {
            topY = Math.floor((object.y) / levelData[l].tileHeight);
            bottomY = Math.floor((object.y + object.height) / levelData[l].tileHeight);
        } else {
            topY = Math.floor((object.y + 1) / levelData[l].tileHeight);
            bottomY = Math.floor((object.y + object.height - 1) / levelData[l].tileHeight);
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
            var tileKey = levelData[l].map[tile.y][tile.x];
            
            if (tileKey in TileMap.types && TileMap.types[tileKey].collide()) {
                handleCollision.call(object, tile.x * levelData[l].tileWidth, tile.y * levelData[l].tileHeight);
                break;
            }
        }
    };
    
    // TileMap Instance Method: returns true if the tile is ready for collisions
    TileMap.prototype.collide = function() {
        return this.block;
    };
    
    return TileMap;
})();

TileMap.types = {
    '#' : TileMap.addType({
        name: 'block',
        block: true,
        display: function(tileX, tileY) {
            fill(0);
            rect(tileX, tileY, levelData[l].tileWidth, levelData[l].tileHeight);
        }
    }),
    'p' : TileMap.addType({
        name: 'pillar',
        block: true,
        display: function(tileX, tileY) {
             image(getImage("cute/WallBlockTall"), tileX, tileY, levelData[l].tileWidth, levelData[l].tileHeight);
        }
    }),
    'g' : TileMap.addType({
        name: 'grass',
        block: false,
        display: function(tileX, tileY) {
            fill(21, 217, 80); // Green color for grass
            var x = tileX, y = tileY, w = levelData[l].tileWidth, h = levelData[l].tileHeight;
            var bladeWidth = w / 1; // Width of each blade of grass
        
            // Draw three blades of grass
            triangle(x + w / 2, y, x, y + h, x + w, y + h);
            triangle(x + w / 2 - bladeWidth, y, x - bladeWidth, y + h, x + w / 2 + bladeWidth, y + h);
            triangle(x + w / 2 + bladeWidth, y, x + w / 2 - bladeWidth, y + h, x + w + bladeWidth, y + h);
        }
    })
};

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
        this.dragForce = airFriction;
        
        // create a camera to track user
        this.camera = config.camera || null;
    }
    
    // accelerates an object by gravity up to a certain terminal velocity
    Actor.prototype.applyGravity = function() {
        this.yAcc = (this.yVel < this.tVel) ? g : 0;
    };
    
    // defines the drag force for the actor in order to apply friction against horizontal movement
    Actor.prototype.applyDrag = function() {
        this.onObject = (this.onTime++ > 5) ? false : this.onObject;
        this.dragForce = (this.onObject) ? this.dragForce : airFriction;
    };
    
    // identifies collision with a tile, and sends control over to handleCollision function
    // Handle X Collisions: this.collideTile(this.collideBlockTileX, true, false);
    // Handle Y Collisions: this.collideTile(this.collideBlockTileY, false, true);
    Actor.prototype.tileCollisions = function(handleCollision, edgesX, edgesY) {
        TileMap.testCollisions(this, handleCollision, edgesX, edgesY);
    };
    
    // handles X collisions between actor and block-tile
    Actor.prototype.handleXCollisions = function(tileX, tileY) {
        var tile = {
            x : tileX,
            y : tileY,
            width : levelData[l].tileWidth,
            height: levelData[l].tileHeight
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
    Actor.prototype.handleYCollisions = function(tileX, tileY) {
        var tile = {
            x : tileX,
            y : tileY,
            width : levelData[l].tileWidth,
            height: levelData[l].tileHeight
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
        this.tileCollisions(this.handleXCollisions, true, false);
        
        this.moveY();
        this.tileCollisions(this.handleYCollisions, false, true);
    
    
        this.display();
        this.camera.track(this);
    };
    
    return Player;
})();

//}

var Game = (function() {
    function Game(config) {
        // map variables
        this.levelMap = config.levelMap || [];
        this.mapPalette = config.mapPalette || {};
        this.level = 1;
        this.mapScale = config.mapScale || 25;
        this.viewCam = null;
        
        // physics variables
        this.airFriction = 0.1;
        this.g = 0.2;
        
        this.entities = [];
    }
    
    return Game;
})();

var entities = [];

function addEntity(type, entity) {
    entities[l][type] = (entities[l].hasOwnProperty(type)) ? entities[l][type] : [];
    entities[l][type].push(entity);
}

/** Game Engine **/
// {
var player1, viewCamera;

// setup level
var CreateLevel = function() {
    // Initialize entities array for the current level
    entities[l] = { };
    
    // setup camera
    levelData[l].width = levelData[l].map[0].length * levelData[l].tileWidth;
    levelData[l].height = levelData[l].map.length * levelData[l].tileHeight;
    viewCam = new Camera(levelData[l].xPos, levelData[l].yPos, width, height, levelData[l]);
    
    for (var columnNum = 0; columnNum < levelData[l].map.length; columnNum++) {
        for (var rowNum = 0; rowNum < levelData[l].map[columnNum].length; rowNum++) {
            var Y = columnNum * levelData[l].tileHeight;
            var X = rowNum * levelData[l].tileWidth;
            switch (levelData[l].map[columnNum][rowNum]) {
                case "#":
                    // Instead of creating blocks, we handle collision with tiles directly in Player's update method
                    break;
                case "@":
                    addEntity('players', new Player({
                        x: X,
                        y: Y,
                        camera: new Camera(levelData[l].xPos, levelData[l].yPos, width, height, levelData[l])
                    }));
                    
                    player1 = entities[l].players[0];
                    viewCamera = player1.camera;
            }
        }
    }
    
    
};

CreateLevel();

var UpdateLevel = function() {
    background(255, 255, 255);

    TileMap.displayTiles();

    // Loop through each type of object in entities
    for (var type in entities[l]) {
        if (entities[l].hasOwnProperty(type)) {
            for (var i = 0; i < entities[l][type].length; i++) {
                entities[l][type][i].update();
            }
        }
    }

};

//}


draw = function() {
    pushMatrix();
    Camera.view(player1.camera);
    UpdateLevel();
    popMatrix();
};
