/**
 * Scene Manager Library (Processing.js)
 * Object Prototypes:
    * TimeManager
    * Mouse
    * Button
    * SceneManager
  * Helper Functions:
    * collision functions
    * setup
  * 
 **/


// TODO: Right now, buttons are created with x/y/width/height, but different arguments will need to be setup to use different shapes (triangle, etc)
// implement extra args {} if necessary

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
// var mouse = new Mouse({
//     cursorType: 'box',
//     width: 25,
//     height: 25,
//     cursor: {
//         display: function(x, y, w, h) {
//             fill(0, 0, 0);
//             rect(x, y, w, h);
//         },
//         state: 'auto'
//     }
// });

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

/** Setup Program **/
function setup() {
    
    // Define scene objects {
    var scene1 = {
        name: "Scene 1",
        init: function() {
            println("Initializing Scene 1...");
        },
        display: function() {
            background(225, 225, 225);
        },
        buttons: [
            new Button({
                x: 100,
                y: 100,
                width: 100,
                height: 50,
                display: function() {
                    if (this.isInside(mouse, this)) {
                        fill(200, 0, 0);
                    } else {
                        fill(255, 0, 0);
                    }
                    noStroke();
                    rect(this.x, this.y, this.width, this.height);
                },
                onClick: function() {
                    sceneTransition('scene2');
                }
            })
        ]
    };
    
    var scene2 = {
        name: "Scene 2",
        init: function() {
            println("Initializing Scene 2...");
        },
        display: function() {
            background(0, 38, 255);
        }
    };
    //}
    
    // Add scenes to the scene manager
    sceneManager.addScene("scene1", scene1);
    sceneManager.addScene("scene2", scene2);
    
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


    