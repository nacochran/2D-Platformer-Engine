// External Functions Used:
// clamp: Helper function to clamp a value between a minimum and maximum
// distance: Helper function to calculate the distance between two points
// pointInTriangle: Helper function to check if a point is inside a triangle
// acos: Returns the arccosine (in radians) of a number
// sin: Returns the sine of a number
// abs: Returns the absolute value of a number
// map: Re-maps a value from one range to another

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

var mouse = new Mouse({
    cursorType: 'box',
    width: 25,
    height: 25,
    cursor: {
        display: function(x, y, w, h) {
            fill(0, 0, 0);
            noStroke();
            rect(x, y, w, h);
        },
        state: 'auto'
    }
});

var rectangle;
var circle;
var ellipseShape;
var triangleShape;
var lineShape;

function checkCollisions() {
  if (rectToRect(rectangle, mouse)) {
    rectangle.color = color(255, 100, 100);
  } else {
    rectangle.color = color(255, 0, 0);
  }
  
  if (rectToCircle(mouse, circle)) {
    circle.color = color(100, 255, 100);
  } else {
    circle.color = color(0, 255, 0);
  }
  
  if (rectToEllipse(mouse, ellipseShape)) {
    ellipseShape.color = color(201, 201, 201);
  } else {
    ellipseShape.color = color(0, 0, 255);
  }
  
  if (rectToTriangle(mouse, triangleShape)) {
    triangleShape.color = color(247, 247, 207);
  } else {
    triangleShape.color = color(255, 255, 0);
  }

  if (rectToLine(mouse, lineShape)) {
      lineShape.color = color(255, 200, 100);
  } else {
      lineShape.color = color(255, 165, 0);
  }
}

function setup() {
  rectangle = {
    x: 50,
    y: 50,
    width: 100,
    height: 80,
    color: color(255, 0, 0)
  };
  
  circle = {
    x: 250,
    y: 100,
    radius: 50,
    color: color(0, 255, 0)
  };
  
  ellipseShape = {
    x: 100,
    y: 250,
    width: 120,
    height: 60,
    theta: 0,
    color: color(0, 0, 255)
  };
  
  triangleShape = {
    x1: 250,
    y1: 300,
    x2: 350,
    y2: 350,
    x3: 300,
    y3: 250,
    color: color(255, 255, 0)
  };
  
  lineShape = {
    x1: 50,
    y1: 350,
    x2: 250,
    y2: 350,
    color: color(255, 165, 0)
  };
}

setup();

draw = function() {
  background(220);
  checkCollisions();
  
  strokeWeight(1);
  
  fill(rectangle.color);
  rect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
  
  fill(circle.color);
  ellipse(circle.x, circle.y, circle.radius * 2, circle.radius * 2);
  
  fill(ellipseShape.color);
  ellipse(ellipseShape.x, ellipseShape.y, ellipseShape.width, ellipseShape.height);
  
  fill(triangleShape.color);
  triangle(triangleShape.x1, triangleShape.y1, triangleShape.x2, triangleShape.y2, triangleShape.x3, triangleShape.y3);
  
  stroke(lineShape.color);
  strokeWeight(3);
  line(lineShape.x1, lineShape.y1, lineShape.x2, lineShape.y2);
  
  
  mouse.update();
};
