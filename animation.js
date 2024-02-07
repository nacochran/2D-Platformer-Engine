

/**
 * Adds a new component to our prop
 **/
function component(shape, args) {
  return {shape: shape, args: args};
}

/**
* Adds a new control to our component
**/
function control(c) {
  return {control: c};
}

/**
* Props Object Constructor
**/
var Prop = (function() {
  function Prop(config) {
      this.x = config.x;
      this.y = config.y;
      this.components = config.components || [];
      this.controls = config.controls || [];
  }
  
  Prop.prototype.display = function() {
      pushMatrix();
      translate(this.x, this.y);
      for (var i = 0; i < this.components.length; i++) {
          var c = this.components[i];
          var shapeFunction = c.shape,
              args = c.args;
          
          // validation: ensure correct # of arguments
          if (args.length < shapeFunction.length + 3) {
              println("Incorrect # of arguments provided for prop component. Please provide the base arguments for your shape function, fillColor, strokeColor, and strokeWeight values.");
              return;
          }
          
          // Convert controls to values
          for (var j = 0; j < args.length; j++) {
              if (typeof args[j] === 'object' && args[j].control) {
                  if (this.controls[args[j].control] !== undefined) {
                      args[j] = this.controls[args[j].control]; // Replace control object with control value
                  } else {
                      println("Component control \"" + args[j].control + "\" does not exist.");
                  }
              }
          }
          
          fill(args[args.length - 3]);
          stroke(args[args.length - 2]);
          if (args[args.length - 1] === 0) {
              noStroke();
          } else {
              strokeWeight(args[args.length - 1]);
          }
          
          var newArgs = args.slice(0, -3);
          // Apply arguments to shapeFunction
          shapeFunction.apply(null, newArgs);
      }
      popMatrix();
  };
  
  Prop.prototype.modifyControl = function(controlName, newValue) {
      if (this.controls.hasOwnProperty(controlName)) {
          this.controls[controlName] = newValue;
      } else {
          println("Control '" + controlName + "' does not exist.");
      }
  };
  
  return Prop;
})();

var prop1 = new Prop({
  x: 0,
  y: 0,
  components: [
      component(ellipse, [0, 0, control("head-size"), control("head-size"), color(255, 0, 0), color(0, 0, 0), 2])
  ],
  controls: {
      "head-size" : 50
  }
});

prop1.modifyControl("head-size", 150);

/**
* Adds a new keyframe to an animation
**/
function keyframe(duration, action) {
  return {duration: duration, action: action};
}

/** 
* Animation Object Constructor 
* Combines multiple small "movements" into one fluid animation
* @run : speed (1-100), direction ("forward" / "reverse"), loop (true/false)
   * default direction is "forward"
   * loop is set to true by default
* 
**/
var Animation = (function () {
  function Animation(keyframes) {
      this.time = 0; // time for cycling through keyframes
      this.keyframes = keyframes || []; // list of keyframes
      this.ckf = 0; // current keyframe
      this.setup = false;
      this.complete = false;
  }
  
  Animation.prototype.display = function(keyframe, t) {
      var keyframe = this.keyframes[keyframe];
      keyframe.action(t);
  };
  
  Animation.prototype.run = function(speed, direction, loop) {
      direction = direction || "forward";
      loop = (typeof loop !== "undefined") ? loop : true;
      
      if (!this.setup) {
          this.ckf = (direction === "forward") ? 0 : this.keyframes.length - 1;
          this.setup = true;
      }
      else if (this.complete) {
          if (direction === "forward") {
              var kfn = this.keyframes.length - 1;
              this.display(kfn, this.keyframes[kfn].duration);
          } else {
              var kfn = 0;
              this.display(kfn, 0);
          }
          return;
      }
      
      var keyframe = this.keyframes[this.ckf];
      keyframe.action(this.time);
      
      this.time += speed/100;
      
       if (this.time > keyframe.duration) {
          if (direction === "forward") {
              this.ckf++;
              this.ckf = (this.ckf > this.keyframes.length - 1) ? 0 : this.ckf;
              this.complete = (this.ckf === 0 && !loop) ? true : false;
          } else {
              this.ckf--;
              this.ckf = (this.ckf < 0) ? this.keyframes.length - 1 : this.ckf;
              this.complete = (this.ckf === this.keyframes.length - 1 && !loop) ? true : false;
          }
          
          this.time = 0;
      }
      
      // println("Direction: " + direction + ", Loop: " + loop);
      // println("Keyframe: " + this.ckf + ", Duration: " + keyframe.duration);
      // println("Time: " + this.time);
  };
  
  Animation.prototype.isComplete = function() {
      return this.complete;
  };

  return Animation;
})();


var an1 = new Animation([
  keyframe(100, function(t) {
      fill(255, 0, 0);
      rect(25 + cos(t * 25) * 50, 25, 300, 300);
  }),
  keyframe(50, function(t) {
      fill(13, 0, 255);
      rect(25 + cos(t * 25) * 50, 25, 300, 300);
  })
]);


draw = function() {
  background(255, 255, 255);
  //an1.run(100, "reverse", true);
  prop1.display();
};


