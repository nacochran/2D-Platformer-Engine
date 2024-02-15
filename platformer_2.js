/**
 * 2D Platformer (Processing.js)
 * Object Prototypes:
    * KeyManager, Tile & TileMap, Camera, Game, Actor, & Player
 * Features: Speedrun functionality
 **/

// TODO: Implement Pause & Play functionality for playback

/**Collisions for mouse interaction**/
// {

/** Helper Functions **/
// {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
    var area = 0.5 * (-y2 * x3 + y1 * (-x2 + x3) + x1 * (y2 - y3) + x2 * y3);
    var s = 1 / (2 * area) * (y1 * x3 - x1 * y3 + (y3 - y1) * px + (x1 - x3) * py);
    var t = 1 / (2 * area) * (x1 * y2 - y1 * x2 + (y1 - y2) * px + (x2 - x1) * py);
    return s > 0 && t > 0 && 1 - s - t > 0;
}

function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    var ua, ub, denominator;
    denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denominator === 0) {
        return false;
    }
    ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}
//}

/** Collision Functions **/
// {
function rectToRect(rect1, rect2) {
    return (
        rect1.x + rect1.width > rect2.x &&
        rect1.x < rect2.x + rect2.width &&
        rect1.y + rect1.height > rect2.y &&
        rect1.y < rect2.y + rect2.height
    );
}

function rectToCircle(rect, circle) {
    var closestX = clamp(circle.x, rect.x, rect.x + rect.width);
    var closestY = clamp(circle.y, rect.y, rect.y + rect.height);
    return distance(circle.x, circle.y, closestX, closestY) <= circle.radius;
}

var rectToEllipse = function(rect, ellipse) {
    var halfW = ellipse.width * 0.5;
    var halfH = ellipse.height * 0.5;
    if (rect.x + rect.width < ellipse.x - halfW || rect.x > ellipse.x + halfW ||
        rect.y + rect.height < ellipse.y - halfH || rect.y > ellipse.y + halfH) {
        return false;
    }
    var angX = (rect.x < ellipse.x) ? acos((rect.x + rect.width - ellipse.x) / halfW) : acos((rect.x - ellipse.x) / halfW);
    var distY = sin(angX) * halfH;
    var r = rect.y < ellipse.y + distY && rect.y + rect.height > ellipse.y - distY;
    return r;
};

var rectToLine = function(r, b) {
    if (!rectToRect(r, {x: b.x1, y: b.y1, width: abs(b.x2 - b.x1), height: abs(b.y2 - b.y1)})) {
        return false;
    }
    var rc = {x : r.x + r.width/2, y : r.y + r.height/2};
    var slope = (b.y2 - b.y1) / (b.x2 - b.x1);
    if (rc.y > map(rc.x, b.x1, b.x2, b.y1, b.y2)) {
        var cc = {y: r.y};
        cc.x = (slope > 0) ? (r.x + r.width) : (r.x);
        if (cc.y < map(cc.x, b.x1, b.x2, b.y1, b.y2)) {
            return map(cc.x, b.x1, b.x2, b.y1, b.y2);
        }
    } else {
        var cc = {y: r.y + r.height};
        cc.x = (slope > 0) ? (r.x) : (r.x + r.width);
        if (cc.y > map(cc.x, b.x1, b.x2, b.y1, b.y2)) {
            return map(cc.x, b.x1, b.x2, b.y1, b.y2) - r.height;
        }
    }
    return false;
};

function rectToTriangle(rect, triangle) {
    var rectCorners = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x, y: rect.y + rect.height },
        { x: rect.x + rect.width, y: rect.y + rect.height }
    ];

    for (var i = 0; i < rectCorners.length; i++) {
        if (pointInTriangle(rectCorners[i].x, rectCorners[i].y, triangle.x1, triangle.y1, triangle.x2, triangle.y2, triangle.x3, triangle.y3)) {
            return true;
        }
    }

    var triangleVertices = [
        { x: triangle.x1, y: triangle.y1 },
        { x: triangle.x2, y: triangle.y2 },
        { x: triangle.x3, y: triangle.y3 }
    ];

    for (var j = 0; j < triangleVertices.length; j++) {
        if (triangleVertices[j].x >= rect.x && triangleVertices[j].x <= rect.x + rect.width &&
            triangleVertices[j].y >= rect.y && triangleVertices[j].y <= rect.y + rect.height) {
            return true;
        }
    }

    return false;
}
//}

/** Archive Functions **/
//{ 
var rotatedEllipseCollide = function(ellipse, rect, functionCollide) {
    //Start by rotating the mouse position so that it lines up with the rotated ellipse.
    //Then do a regular collision check! Easy peasy!

    var rectAng = atan((ellipse.y - rect.y) / (ellipse.x - rect.x));
    var rectDist = sqrt(sq(ellipse.y - rect.y) + sq(ellipse.x - rect.x));

    //Store the actual mouseX and mouseY values
    var rectX = rect.x;
    var rectY = rect.y;

    //Change their values so the normal collision detection works with their new coords
    rect.x = cos(rectAng - ellipse.theta) * rectDist + ellipse.x;
    rect.y = sin(rectAng - ellipse.theta) * rectDist + ellipse.y;

    //Do the regular collision check with the rotated mouse coords
    var regularCollide = functionCollide(ellipse, rect);

    //Restore their values to normal.
    rect.x = rectX;
    rect.y = rectY;

    return regularCollide;
};

var rectToArrowCollide = function(rect, tX, tY, tW, tH, tS) {
    //For left arrows
    if (rect.x + rect.width > tX && rect.x < tX + tW / 2 && rect.y + rect.height > tY && rect.y < tY + tH && tS === "left") {
        if (rect.y + rect.height > tY + tH / 2 && rect.y < tY + tH / 2) {
            return true;
        } else if (rect.y + rect.height / 2 > tY + tH / 2) {
            return rect.y < map(rect.x + rect.width, tX, tX + tW / 2, tY + tW / 4, tY + tH);
        } else {
            return rect.y + rect.height > map(rect.x + rect.width, tX, tX + tW / 2, tY + tH / 2, tY);
        }
    } else if (rect.x + rect.width > tX + tW / 2 && rect.x < tX + tW && rect.y + rect.height > tY + tH / 4 && rect.y < tY + (3 * tH / 4) && tS === "left") {
        return true;
    }

    //For right arrows
    if (rect.x + rect.width > tX + tW / 2 && rect.x < tX + tW && rect.y + rect.height > tY && rect.y < tY + tH && tS === "right") {
        if (rect.y + rect.height > tY + tH / 2 && rect.y < tY + tH / 2) {
            return true;
        } else if (rect.y + rect.height / 2 > tY + tH / 2) {
            return rect.y < map(rect.x, tX + tW / 2, tX + tW, tY + tH, tY + tH / 2);
        } else {
            return rect.y + rect.height > map(rect.x, tX + tW / 2, tX + tW, tY, tY + tH / 2);
        }
    } else if (rect.x + rect.width > tX && rect.x < tX + tW / 2 && rect.y + rect.height > tY + tH / 4 && rect.y < tY + (3 * tH / 4) && tS === "right") {
        return true;
    }

    //For up arrows
    if (rect.x + rect.width > tX && rect.x < tX + tW && rect.y + rect.height > tY && rect.y < tY + tH / 2 && tS === "up") {
        if (rect.x + rect.width > tX + tW / 2 && rect.x < tX + tW / 2) {
            return true;
        } else if (rect.x + rect.width / 2 > tX + tW / 2) {
            return rect.y + rect.height > map(rect.x, tX + tW / 2, tX + tW, tY, tY + tH / 2);
        } else {
            return rect.y + rect.height > map(rect.x + rect.width, tX, tX + tW / 2, tY + tH / 2, tY);
        }
    } else if (rect.x + rect.width > tX + tW / 4 && rect.x < tX + (3 * tW / 4) && rect.y + rect.height > tY + tH / 2 && rect.y < tY + tH && tS === "up") {
        return true;
    }

    //For down arrows 
    if (rect.x + rect.width > tX && rect.x < tX + tW && rect.y + rect.height > tY && rect.y < tY + tH && tS === "down") {
        if (rect.x + rect.width > tX + tW / 2 && rect.x < tX + tW / 2) {
            return true;
        } else if (rect.x + rect.width / 2 > tX + tW / 2) {
            return rect.y < map(rect.x, tX + tW / 2, tX + tW, tY + tH, tY + tH / 2);
        } else {
            return rect.y < map(rect.x + rect.width, tX, tX + tW / 2, tY + tH / 2, tY + tH);
        }
    } else if (rect.x + rect.width > tX + tW / 4 && rect.x < tX + (3 * tW / 4) && rect.y + rect.height > tY && rect.y < tY + tH / 2 && tS === "up") {
        return true;
    }
};
//}

//}

/** 
 * @object_constructor TimeManager
 **/
var TimeManager = (function() {
    function TimeManager(config) {
        this.callback = config.callback || function() {};
        this.time = 0;
        this.duration = config.duration;
        this.onFinish = config.onFinish || function() {};
    }
    
    TimeManager.intervals = [];
    
    TimeManager.runIntervals = function() {
        for (var i = 0; i < TimeManager.intervals.length; i++) {
            var currentInterval = TimeManager.intervals[i];
            currentInterval.execute(i);
        }
    };
    
    TimeManager.addInterval = function(interval) {
        TimeManager.intervals.push(new TimeManager({
            callback: interval.callback,
            duration: interval.duration,
            onFinish: interval.onFinish
        }));
    };
    
    TimeManager.prototype.execute = function(index) {
        this.callback();
        if (++this.time >= this.duration) {
            this.onFinish();
            TimeManager.intervals.splice(index, 1);
        }
    };
    
    return TimeManager;
})();

/**
 * @object_constructor Mouse
 **/
var Mouse = (function() {
    function Mouse(config) {
        this.x = config.x;
        this.y = config.y;
        this.width = config.width || 0;
        this.height = config.height || 0;
        this.prevX = this.x;
        this.prevY = this.y;
        this.moving = false;
        this.events = [];
        this.cursorType = config.cursorType || "default";
        // Cursor States in PJS: auto, pointer, grab, grabbing, wait, text, not-allowed, copy, zoom-in, zoom-out, all-scroll, cross-hair, cell, context-menu, help, ew-resize, ns-resize, nesw-resize, nwse-resize, alias, vertical-text
        this.cursor = config.cursor || {state : "auto", display: function() {} };
    }

    Mouse.prototype.setPosition = function(x, y) {
        this.x = x;
        this.y = y;
        this.moving = (this.x !== this.prevX || this.y !== this.prevY) ? true : false;
        this.prevX = this.x;
        this.prevY = this.y;
    };

    Mouse.prototype.display = function() {
        if (this.cursorType === "default") {
            cursor(this.cursor.state);
        } else {
            cursor('none');
            this.cursor.display(this.x, this.y, this.width, this.height);
        }
    };

    Mouse.prototype.onMove = function(callback) {
        var self = this;
        var c = function() { 
            if (self.moving) {
                callback(); 
            }
        };
        this.events.push(c);
    };

    Mouse.prototype.onClick = function(callback) {
        mouseClicked = callback;
    };

    Mouse.prototype.handleEvents = function() {
        for (var i = 0; i < this.events.length; i++) {
            this.events[i]();
        }
    };

    Mouse.prototype.update = function() {
        this.setPosition(mouseX, mouseY);
        this.display();
        this.handleEvents();
    };

    return Mouse;
})();

/**
 * @object_constructor Button
 **/
var Button = (function() {
    function Button(config) {
        this.display = config.display || function() {};
        this.onClick = config.onClick || function() {};
        this.x = config.x;
        this.y = config.y;
        this.width = config.width;
        this.height = config.height;
        // extra args
        this.args = config.args || {};
        
        this.shape = config.shape || 'rect';
        this.side = config.side || 'left';
        this.theta = config.theta || 0;
    }
    
    Button.types = {};
    
    Button.registerType = function(type, func) {
        Button.types[type] = func;
    };
    
    // assumes obj is a rectangle
    Button.prototype.isInside = function(obj) {
        return Button.types[this.shape](obj, this);
    };
    
    Button.prototype.handleClick = function(obj) {
        if (this.isInside(obj)) {
            this.onClick();
        }
    };
    
    Button.prototype.update = function() {
        this.display();
    };
    
    return Button;
})();

// Register Button Types
Button.registerType('rect', rectToRect);
Button.registerType('triangle', rectToTriangle);
Button.registerType('circle', rectToCircle);
Button.registerType('ellipse', rectToEllipse);

/**
 * @object_constructor SceneManager
 **/
var SceneManager = (function() {
    function SceneManager() {
        this.scenes = {};
        this.currentScene = null;
        this.transitioning = false;
        this.targetScene = null;
    }
    
    SceneManager.prototype.addScene = function(name, scene) {
        this.scenes[name] = {
            name : scene.name,
            init: scene.init,
            display: scene.display,
            buttons: scene.buttons || []
        };
    };
    
    SceneManager.prototype.setScene = function(name) {
        if (this.scenes.hasOwnProperty(name)) {
            this.currentScene = this.scenes[name];
            this.currentScene.init();
        } else {
            println("Scene '" + name + "' does not exist.");
        }
    };
    
    SceneManager.prototype.displayScene = function() {
        this.currentScene.display();
        for (var i = 0; i < this.currentScene.buttons.length; i++) {
            var button = this.currentScene.buttons[i];
            button.display();
        }
    };
    
    SceneManager.prototype.handleButtons = function(mouse) {
        if (!this.transitioning) {
            for (var i = 0; i < this.currentScene.buttons.length; i++) {
                var button = this.currentScene.buttons[i];
                button.handleClick(mouse);
            }
        }
    };
    
    return SceneManager;
})();

/** Global Variables **/
var mouse = new Mouse({});

var sceneManager = new SceneManager();

function openScene(onFinish) {
    TimeManager.addInterval({
        callback: function() {
            var closed = 200 - (this.time/this.duration)*200;
            fill(0, 0, 0);
            rect(-200 + closed, 0, 200, 400);
            rect(400 - closed, 0, 200, 400);
        },
        duration: 25,
        onFinish: onFinish
    });
}
function closeScene(onFinish) {
    TimeManager.addInterval({
        callback: function() {
            var closed = 0 + (this.time/this.duration)*200;
            fill(0, 0, 0);
            rect(-200 + closed, 0, 200, 400);
            rect(400 - closed, 0, 200, 400);
        },
        duration: 25,
        onFinish: onFinish
    });
}

function sceneTransition(targetScene) {
    sceneManager.transitioning = true;
    closeScene(function() {
        sceneManager.setScene(targetScene);
        openScene(function() {
            sceneManager.transitioning = false;
        });
    });
}

/**
 * @object_constructor KeyManager
 * Credit to Jonathan Roley for inspiration and design in parts of this object constructor
 **/
var KeyManager = (function() {
    function KeyManager() {
        this.keys = {};
        this.keyCodeMap = {};
        this.current = {};
        this.recording = false;
        this.inputData = [];
        this.records = [];
        
        // playing back a record
        this.playRecord = [];
        this.pressedKeys = [];
        this.playing = false;
        this.paused = false;
        this.time = 0;
        this.startTime = 0;
        this.completeRecord = false;
    }

    KeyManager.prototype.register = function(key, name, keyCode) {
        this.keys[key] = { keyCode: keyCode, name: name };
        this.keyCodeMap[keyCode] = key;
    };

    KeyManager.prototype.pressed = function(selector) {
        if(typeof selector === 'string') {
            selector = (
                this.keys[selector] &&
                this.keys[selector].keyCode
            );
        }
        if (!selector) {
            return false;
        }
        return this.current[selector];
    };

    KeyManager.prototype.keyPressed = function(keyCode) {
        if (!this.playing && !this.current[keyCode]) {
            this.current[keyCode] = true;
            if (this.recording) {
                var startTime = Date.now() - this.startTime;
                this.inputData.push({ keyCode: keyCode, startTime: startTime });
            }
        }
    };
    
    KeyManager.prototype.keyReleased = function(keyCode) {
        //println('key released: ' + this.keyCodeMap[keyCode] + ", date: " + (Date.now() - this.startTime));
        
        if (!this.playing && this.current[keyCode]) {
            delete this.current[keyCode];
            if (this.recording) {
                // Iterate over all recorded inputs
                for (var i = this.inputData.length - 1; i >= 0; i--) {
                    var input = this.inputData[i];
                    if (input.keyCode === keyCode && !input.endTime) {
                        // Set the end time for the corresponding key press
                        input.endTime = Date.now() - this.startTime;
                        break; // Stop iterating after setting the end time
                    }
                }
            }
        }
    };
    
    KeyManager.prototype.startRecording = function() {
        if (!this.recording) {
            this.inputData = [];
            this.startTime = Date.now(); // Record the start time of recording
            this.recording = true;
        }
    };

    KeyManager.prototype.stopRecording = function() {
        if (this.recording) {
            this.records.push(this.inputData);
            this.recording = false;
            this.inputData = [];
        }
    };
    
    KeyManager.prototype.prepRecord = function(recordIndex) {
        // Sort the record array by startTime
        this.records[recordIndex].sort(function(a, b) {
            return a.startTime - b.startTime;
        });
        this.playing = true;
        this.paused = false;
        this.startTime = Date.now();
        this.completeRecord = false;
        this.playRecord = this.records[recordIndex].slice();
        this.pressedKeys = [];
    };

    KeyManager.prototype.runRecord = function(recordIndex) {
        if (recordIndex >= 0 && recordIndex < this.records.length) {
            if (!this.paused) {
                // Update time if playing
                this.time = Date.now() - this.startTime;
                
                while (this.playRecord.length > 0 && this.time >= this.playRecord[0].startTime) {
                    this.current[this.playRecord[0].keyCode] = true;
                    this.pressedKeys.push(this.playRecord[0]);
                    this.playRecord.splice(0, 1);
                }
        
                if (this.pressedKeys.length > 0) {
                    for (var i = this.pressedKeys.length - 1; i >= 0; i--) {
                        var keyEvent = this.pressedKeys[i];
                        
                        if (keyEvent.endTime && this.time >= keyEvent.endTime) {
                            // Mark the key to be removed from pressedKeys
                            this.pressedKeys.splice(i, 1);
                            this.current[keyEvent.keyCode] = false;
                        }
                    }
                }
                
                if (this.playRecord.length === 0 && this.pressedKeys.length === 0) {
                    this.completeRecord = true;
                    this.playing = false;
                }
            }
        } else {
            println("Invalid record index.");
        }
    };
    
    KeyManager.prototype.isPlaying = function() {
        return this.playing && !this.paused;
    };
    
    KeyManager.prototype.pause = function() {
        this.paused = true;
    };
    
    KeyManager.prototype.play = function() {
        this.startTime = Date.now() - this.time;
        this.paused = false;
    };


    return KeyManager;
})();

var keys = new KeyManager();

keys.register('jump', 'Jump', UP);
keys.register('right', 'Move right', RIGHT);
keys.register('left', 'Move left', LEFT);
keys.register('ground_pound', 'Ground pound', DOWN);

function keyPressed() {
    keys.keyPressed(keyCode);
}
function keyReleased() {
    keys.keyReleased(keyCode);
}

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
        
        // for speedruns
        this.speedrun = false;
        this.record = 0;
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
        
        this.player1 = this.entities[l].players[0];
        this.viewCamera = this.player1.camera;
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
        
        if (this.speedrun) {
            keys.runRecord(this.record);
            this.speedrun = (keys.completeRecord) ? false : true;
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
        if (!(keys.playing && keys.paused)) {
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
        }
    };
    
    // updates actor's y position based on activation input (activateJump)
    Actor.prototype.updateY = function(activateJump) {
        if (!(keys.playing && keys.paused)) {
            if (activateJump && abs(this.yVel) < 0.1 && abs(this.yAcc) < 0.1) {
                this.yVel = -5;
            }
            
            this.applyGravity();
        
            this.y += this.yVel;
            this.yVel += this.yAcc;
        }
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
        this.updateX(keys.pressed('left'), keys.pressed('right'));
    };
    
    // handle y movement
    Player.prototype.moveY = function() {
        this.updateY(keys.pressed('jump'));
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



/** Setup Program **/
function setup() {
    
    // Define scene objects {
    var scene1 = {
        name: "Scene 1",
        init: function() {
            game.createLevel();
        },
        display: function() {
            pushMatrix();
            Camera.view(game.viewCamera);
            game.runLevel();
            popMatrix();
        },
        buttons: [
            new Button({
                x: 40,
                y: 10,
                width: 100,
                height: 30,
                display: function() {
                    if (this.isInside(mouse, this)) {
                        fill(200, 0, 0);
                    } else {
                        fill(255, 0, 0);
                    }
                    noStroke();
                    rect(this.x, this.y, this.width, this.height);
                    fill(0, 0, 0);
                    textSize(20);
                    text("Start", this.x + 29, this.y + 22);
                },
                onClick: function() {
                    keys.startRecording();
                }
            }),
            new Button({
                x: 155,
                y: 10,
                width: 100,
                height: 30,
                display: function() {
                    if (this.isInside(mouse, this)) {
                        fill(200, 0, 0);
                    } else {
                        fill(255, 0, 0);
                    }
                    noStroke();
                    rect(this.x, this.y, this.width, this.height);
                    fill(0, 0, 0);
                    textSize(20);
                    text("Stop", this.x + 31, this.y + 22);
                },
                onClick: function() {
                    keys.stopRecording();
                }
            }),
            new Button({
                x: 270,
                y: 10,
                width: 100,
                height: 30,
                display: function() {
                    if (this.isInside(mouse, this)) {
                        fill(200, 0, 0);
                    } else {
                        fill(255, 0, 0);
                    }
                    noStroke();
                    rect(this.x, this.y, this.width, this.height);
                    fill(0, 0, 0);
                    textSize(20);
                    text("Speedrun", this.x + 8, this.y + 22);
                },
                onClick: function() {
                    game.createLevel();
                    keys.prepRecord(0);
                    game.speedrun = true;
                }
            }),
            new Button({
                x: 155,
                y: 50,
                width: 20,
                height: 20,
                args: { state : 'pause' },
                display: function() {
                    if (this.isInside(mouse, this)) {
                        fill(161, 0, 0);
                    } else {
                        fill(217, 0, 0);
                    }
                    
                    if (this.args.state === 'pause') {
                        rect(this.x, this.y, this.width/3, this.height);
                        rect(this.x + 2*this.width/3, this.y, this.width/3, this.height);
                    } else {
                        triangle(this.x, this.y, this.x + this.width, this.y + this.height/2, this.x, this.y + this.height);
                    }
                },
                onClick: function() {
                    if (this.args.state === 'pause') {
                        this.args.state = 'play';
                        keys.pause();
                    } else {
                        this.args.state = 'pause';
                        keys.play();
                    }
                }
            })
        ]
    };
    //}
    
    // Add scenes to the scene manager
    sceneManager.addScene("scene1", scene1);
    
    // Set initial scene
    sceneManager.setScene("scene1");
}
setup();


/** Program Event Loop */
draw = function() {
    sceneManager.displayScene();
    TimeManager.runIntervals();
    mouse.update();
};

/** Program Mouse Events **/
// {
mouse.onClick(function() {
    sceneManager.handleButtons(mouse);
});

mouse.onMove(function() {
    
});
//}
