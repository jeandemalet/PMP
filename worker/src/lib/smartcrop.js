/*
SmartCrop.js - Intelligent cropping library
https://github.com/jwagner/smartcrop.js
Version fonctionnelle pour l'utilisation avec Node.js
*/

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.SmartCrop = factory());
}(this, (function () { 'use strict';

  // Version fonctionnelle de SmartCrop pour Node.js
  function SmartCrop() {
    // Pas besoin d'instance pour cette version
  }

  // Méthode principale de recadrage - approche fonctionnelle
  SmartCrop.crop = function(image, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    var opts = {
      width: 100,
      height: 100,
      imageOperations: null,
      crop: {
        maxScale: 1,
        maxWidth: 1024,
        maxHeight: 1024
      }
    };

    // Fusionner les options
    for (var k in options) opts[k] = options[k];

    if (typeof callback === 'undefined') {
      return new Promise(function(resolve, reject) {
        SmartCrop._crop(image, opts, function(err, result) {
          if (err) reject(err);
          else resolve(result);
        });
      });
    } else {
      SmartCrop._crop(image, opts, callback);
    }
  };

  SmartCrop.prototype._crop = function(image, options, callback) {
    var self = this;

    if (typeof image === 'string') {
      // Load image from file path
      if (options.imageOperations && options.imageOperations.open) {
        options.imageOperations.open(image).then(function(canvas) {
          self._processCanvas(canvas, options, callback);
        }).catch(callback);
      } else {
        callback(new Error('No image operations provided for file loading'));
      }
    } else if (image.getContext) {
      // Canvas element
      self._processCanvas(image, options, callback);
    } else {
      callback(new Error('Unsupported image type'));
    }
  };

  SmartCrop.prototype._processCanvas = function(canvas, options, callback) {
    var self = this;

    // Get image data
    if (options.imageOperations && options.imageOperations.getData) {
      options.imageOperations.getData(canvas).then(function(imgData) {
        var result = self.analyze(imgData, options);
        callback(null, result);
      }).catch(callback);
    } else {
      // Fallback for browser environment
      var ctx = canvas.getContext('2d');
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var result = self.analyze(imageData, options);
      callback(null, result);
    }
  };

  SmartCrop.prototype.analyze = function(imageData, options) {
    var result = {
      topCrop: null,
      crops: []
    };

    var width = imageData.width;
    var height = imageData.height;
    var data = imageData.data;

    var targetWidth = options.width;
    var targetHeight = options.height;
    var aspectRatio = targetWidth / targetHeight;

    // Generate crop candidates
    var crops = this._generateCrops(width, height, aspectRatio, options);

    // Score each crop
    for (var i = 0; i < crops.length; i++) {
      var crop = crops[i];
      crop.score = this._scoreCrop(data, width, height, crop);
      result.crops.push(crop);

      if (!result.topCrop || crop.score > result.topCrop.score) {
        result.topCrop = crop;
      }
    }

    return result;
  };

  SmartCrop.prototype._generateCrops = function(imageWidth, imageHeight, aspectRatio, options) {
    var crops = [];
    var minDimension = Math.min(imageWidth, imageHeight);
    var cropWidth = Math.min(options.crop.maxWidth, imageWidth);
    var cropHeight = Math.min(options.crop.maxHeight, imageHeight);

    // Try different scales
    var scales = [0.25, 0.5, 1.0];
    if (options.crop.maxScale) {
      scales.push(options.crop.maxScale);
    }

    for (var s = 0; s < scales.length; s++) {
      var scale = scales[s];
      var w = Math.floor(cropWidth * scale);
      var h = Math.floor(cropHeight * scale);

      if (w <= 0 || h <= 0) continue;

      // Slide over the image
      var step = Math.max(8, Math.floor(minDimension / 100));

      for (var y = 0; y + h <= imageHeight; y += step) {
        for (var x = 0; x + w <= imageWidth; x += step) {
          crops.push({
            x: x,
            y: y,
            width: w,
            height: h,
            scale: scale
          });
        }
      }
    }

    return crops;
  };

  SmartCrop.prototype._scoreCrop = function(data, width, height, crop) {
    var score = 0;

    // Get crop boundaries
    var cropX = Math.floor(crop.x);
    var cropY = Math.floor(crop.y);
    var cropWidth = Math.floor(crop.width);
    var cropHeight = Math.floor(crop.height);

    // Calculate edge score (prefer crops away from edges)
    var edgeScore = this._calculateEdgeScore(cropX, cropY, cropWidth, cropHeight, width, height);

    // Calculate saturation score
    var saturationScore = this._calculateSaturationScore(data, width, height, cropX, cropY, cropWidth, cropHeight);

    // Calculate brightness score (avoid too dark or too bright areas)
    var brightnessScore = this._calculateBrightnessScore(data, width, height, cropX, cropY, cropWidth, cropHeight);

    // Combine scores
    score = edgeScore * 0.3 + saturationScore * 0.4 + brightnessScore * 0.3;

    return score;
  };

  SmartCrop.prototype._calculateEdgeScore = function(cropX, cropY, cropWidth, cropHeight, imageWidth, imageHeight) {
    var score = 0;

    // Distance from edges (crops in center get higher score)
    var distanceFromLeft = cropX;
    var distanceFromTop = cropY;
    var distanceFromRight = imageWidth - (cropX + cropWidth);
    var distanceFromBottom = imageHeight - (cropY + cropHeight);

    var minDistance = Math.min(distanceFromLeft, distanceFromTop, distanceFromRight, distanceFromBottom);
    score = Math.min(minDistance / 50, 1.0) * 100;

    return score;
  };

  SmartCrop.prototype._calculateSaturationScore = function(data, width, height, cropX, cropY, cropWidth, cropHeight) {
    var totalSaturation = 0;
    var pixelCount = 0;

    for (var y = cropY; y < cropY + cropHeight; y++) {
      for (var x = cropX; x < cropX + cropWidth; x++) {
        var index = (y * width + x) * 4;

        if (index + 2 < data.length) {
          var r = data[index];
          var g = data[index + 1];
          var b = data[index + 2];

          // Calculate saturation using HSV conversion
          var max = Math.max(r, g, b);
          var min = Math.min(r, g, b);
          var saturation = max === 0 ? 0 : (max - min) / max;

          totalSaturation += saturation;
          pixelCount++;
        }
      }
    }

    return pixelCount > 0 ? (totalSaturation / pixelCount) * 100 : 0;
  };

  SmartCrop.prototype._calculateBrightnessScore = function(data, width, height, cropX, cropY, cropWidth, cropHeight) {
    var totalBrightness = 0;
    var pixelCount = 0;

    for (var y = cropY; y < cropY + cropHeight; y++) {
      for (var x = cropX; x < cropX + cropWidth; x++) {
        var index = (y * width + x) * 4;

        if (index + 2 < data.length) {
          var r = data[index];
          var g = data[index + 1];
          var b = data[index + 2];

          // Calculate brightness (luminance)
          var brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          totalBrightness += brightness;
          pixelCount++;
        }
      }
    }

    if (pixelCount === 0) return 0;

    var averageBrightness = totalBrightness / pixelCount;

    // Prefer medium brightness (avoid too dark or too bright)
    var score = 100 - Math.abs(averageBrightness - 0.5) * 200;

    return Math.max(0, score);
  };

  return SmartCrop;

})));
