angular.module('picker', [])

// Color Picker Directive
.directive('picker', function() {

})


// Picker for selecting a hue
.directive('hueSpace', function() {

})


// Service for Creating Reusable Widgets
.service('Widgets', function() {

  this.cursor = function() {
    var cursor = document.createElement('div');
    cursor.setAttribute('class', 'cursor');
    cursor.style.position = 'absolute';
    cursor.style.top = 0;
    cursor.style.left = 0;

    return {
      element: cursor,
      x: 0,
      y: 0
    };
  };

  this.canvas = function() {
    var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d');

    return {
      canvas: canvas,
      context: context
    };
  };

})


.directive('colorSpace', function(Widgets, ConvertColor) {
  return {
    restrict: 'E',
    scope: {
      hue: '=',
      select: '&'
    },
    controller: function($scope) {
      $scope.$watch('hue', function() {
        // redraw colour space
      });
    },
    link: function(scope, element) {
      var space = Widgets.canvas(),
          canvas = space.canvas,
          context = space.context,
          cursor = Widgets.cursor();

      // Pick the color at the cursor
      // (relies on cursor staae
      // rather than arguments)
      scope.pick = function() {
        var x, y, data, rgb, hex;

        // get cursor's position
        x = cursor.element.style.left;
        y = cursor.element.style.right;
        data = context.getImageData(x, y, 1, 1);

        // convert to rgb
        hex = ConvertColor
          .fromRGB(data[0], data[1], data[2])
          .toHex();

        // expose $color for select expression
        scope.select({
          $color: hex
        });
      };

      // move a cursor based on a mouse event
      // expects to be called with `this` set
      // to the parent element.
      scope.moveCursor = function(event) {
        var bounds = this.getBoundingClientRect(),
            x = e.pageX - bounds.left,
            y = e.pageY - bounds.top;

        // update cursor's position
        cursor.element.style.left = e.pageX;
        cursor.element.style.top  = e.pageY;

        // pick the color at this position
        scope.pick();
      };

      // if mousedown move cursor
      scope.mouseMove = function(mousedown, event) {
        if(scope.mousedown) {
          scope.moveCursor.call(this, event);
        }
      };

      // toggle mouse state
      scope.mouseToggle = function(mousedown) {
        scope.mousedown = mousedown;
      };

      // resize canavas
      scope.resize = function() {
        canvas.width = element.prop('offsetWidth');
        canvas.height = element.prop('offsetHeight');
      };

      // redraw space
      scope.draw = function() {
        var h, s, l, x, y, gradient;

        h = scope.hue;
        s = 0;
        l = 0;

        for(y = 0; y < canvas.height; y++) {
          l = 100 - ((y / height) * 100);

          gradient = ctx.createLinearGradient(0, 0, width, 0);
          gradient.addColorStop(0, 'hsl(' + h + ', 0%, ' + l + '%)');
          gradient.addColorStop(1, 'hsl(' + h + ', 100%, ' + l + '%)');

          context.fillStyle = gradient;
          context.fillRect(0, y, canvas.width, 0);
        }

      };

      scope.resize();
      scope.mousedown = false;
      scope.draw();

      element.append(canvas);
      element.append(cursor.element);

      canvas.addEventListener('mouseup',   scope.mouseToggle.bind(null, false));
      canvas.addEventListener('mousedown', scope.mouseToggle.bind(null, true));
      canvas.addEventListener('mousemove', scope.mouseMove);
      canvas.addEventListener('click',     scope.updateCursor);
    }
  };
})


.service('Color', function(Hex) {

  // Color Class
  function Color(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  // Returns an array representation of a color
  Color.prototype.toRGB = function() {
    return [this.r, this.g, this.b];
  };

  // Converts a color to a Hex string
  Color.prototype.toHex = function() {
    return ['#']
      .concat(this.toRGB().map(this.decToHex))
      .join('');
  };

  // Converts a color to HSL where:
  // H is in the range [0, 360]
  // S, L are in the range [0, 1]
  Color.prototype.toHSL = function() {
    var r, g, b, min, max, h, s, l, delta, dr, dg, rb;

    r = this.r / 255;
    g = this.g / 255;
    b = this.b / 255;

    min = Math.min(r, g, b);
    max = Math.max(r, g, b);
    delta = max - min;

    l = (max + min) / 2;

    if(delta === 0) {
      h = 0;
      s = 0;
    } else {
      if(l < 0.5) {
        s = delta / (max + min);
      } else {
        s = delta / (2 - max - min);
        dr = (((max - r) / 6) + (delta / 2)) / delta;
        dg = (((max - g) / 6) + (delta / 2)) / delta;
        db = (((max - b) / 6) + (delta / 2)) / delta;

        if      (r === max) h = db - dg;
        else if (g === max) h = (1/3) + dr - db;
        else                h = (2/3) + dg - dr;

        if(h < 0) h += 1;
        if(h > 1) h -= 1;
      }
    }

    return [h * 360, s, l];
  };

  // Convert a decimal to a padded hex
  Color.prototype.decToHex = function(dec) {
    return Hex.pad(dec.toString(16));
  };

  // Factory wrapper for creating instances
  this.create = function(r, g, b) {
    return new Color(r, g, b);
  };
})


.factory('ConvertColor', function(Color, Hex) {

  // Create a color from primitive rgb values
  // expected within the range [0, 255]
  this.fromRGB = function(r, g, b) {
    return Color.create(r, g, b);
  };

  // Create a color from a hex string
  // Hash can be omitted and string
  // can be full form (6 chars) or short
  // form (3 chars).
  this.fromHex = function(dirty) {
    var hex = Hex.normalize(dirty),
        rgb = [],
        part = null,
        index = 0;

    for(index = 0; index < 6; index += 2) {
      part = hex.slice(index, index + 2);
      rgb.push(parseInt(part, 16));
    }

    return Color.create.apply(null, rgb);
  };

  // Create a color from HSL values
  // H expected within the range [0, 360]
  // S, L expected within the range [0, 1]
  this.fromHSL = function(h, s, l) {
    var chroma, hue, x, rgb;

    chroma = (1 - Math.abs((2 * l) - 1)) * s;
    hue = h / 60;
    x = chroma * (1 - Math.abs((hue % 2) - 1));

    if(hue >= 0 && hue < 1) rgb = [chroma, x, 0];
    if(hue >= 1 && hue < 2) rgb = [x, chroma, 0];
    if(hue >= 2 && hue < 3) rgb = [0, chroma, x];
    if(hue >= 3 && hue < 4) rgb = [0, x, chroma];
    if(hue >= 4 && hue < 5) rgb = [x, 0, chroma];
    if(hue >= 5 && hue < 6) rgb = [chroma, 0, x];

    m = l - (chroma / 2);

    return Color.create.apply(null, rgb.map(function(part) {
      return part + m;
    }));
  };
})


.service('Hex', function() {
  this.validator = new RegExp(/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);

  this.validate = function(hex) {
    var matches = hex.match(this.validator);

    if(matches) {
      return matches.pop();
    } else {
      return null;
    }
  };

  this.pad = function(hex) {
    return ('00' + hex).slice(-2);
  };

  this.normalize = function(dirty) {
    var hex = this.validate(dirty);

    if(hex.length === 3) {
      return hex.split('')
        .map(duplicate)
        .reduce(concat, [])
        .join('');
    } else {
      return hex;
    }

    // concatenate a series of sub arrays
    function concat(str, substr) {
      str.concat(substr);
    }

    // duplicate an item into an array
    function duplicate(a) {
      return  [a, a];
    }
  };
});
