
function grayscaleFilter( image ) {
  for (var x = 0; x < image.width; x++) {
    for (var y = 0; y < image.height; y++) {
      var pixel = image.getPixel(x, y);
      var luminance = 0.2126 * pixel.data[0] + 0.7152 * pixel.data[1] + 0.0722 * pixel.data[2];
      pixel.data[0] = luminance;
      pixel.data[1] = luminance;
      pixel.data[2] = luminance;

      image.setPixel(x, y, pixel);
    }
  }

  return image;
}

function cdfcalc( image ) {
  var num_gray = 100;
  var total_pixels = image.width * image.height;
  var num_pixels_i = [];

  for (var i = 0; i <= num_gray; i++) {
    num_pixels_i[i] = 0;
  }

  for (var x = 0; x < image.width; x++) {
    for (var y = 0; y < image.height; y++) {
      var pixel = image.getPixel(x, y);
      var pixel_hsl = pixel.rgbToHsl();
      var L = Math.round(pixel_hsl.data[2] * num_gray);
      num_pixels_i[L]++;
    }
  }

  var pdf = [];
  for (var i = 0; i <= num_gray; i++) {
    pdf[i] = num_pixels_i[i]/total_pixels;
  }

  function innercdfcalc( i, pdf ) {
    var cdf = 0;
    for (var j = 0; j < i; j++) {
      cdf += pdf[j];
    }

    return cdf;
  }

  var cdf = []
  for (var i = 0; i <= pdf.length; i++) {
    cdf[i] = innercdfcalc(i, pdf);
  }

  return cdf;
}

function histogramMatchFilter( image, refImg, value ) {
  var cdf_img = cdfcalc(image);
  var cdf_ref = cdfcalc(refImg);
  var num_gray = 100;

  for (var i = 0; i < cdf_img.length; i++) {

    var error;
    var minerror = Number.POSITIVE_INFINITY;
    var minindex;
    for (var j = 0; j < cdf_ref.length; j++) {
      error = Math.abs(cdf_ref[j] - cdf_img[i]);
      if (error < minerror) {
        minerror = error;
        minindex = j;
      }
    }

    cdf_img[i] = minindex / (num_gray - 1);
  }

  // luminance
  if (value >= 0.5) {
    for (var x = 0; x < image.width; x++) {
      for (var y = 0; y < image.height; y++) {
        var pixel = image.getPixel(x, y);
        var pixel_hsl = pixel.rgbToHsl();
        pixel_hsl.data[2] = cdf_img[Math.round(pixel_hsl.data[2] * num_gray)];
        pixel = pixel_hsl.hslToRgb();
        image.setPixel(x, y, pixel);
      }
    }
  }
  // rgb
  else {
    for (var x = 0; x < image.width; x++) {
      for (var y = 0; y < image.height; y++) {
        var pixel = image.getPixel(x, y);
        pixel.data[0] = cdf_img[Math.round(pixel.data[0] * num_gray)];
        pixel.data[1] = cdf_img[Math.round(pixel.data[1] * num_gray)];
        pixel.data[2] = cdf_img[Math.round(pixel.data[2] * num_gray)];
        image.setPixel(x, y, pixel);
      }
    }

  }

  return image;
}

function gammaFilter( image, logOfGamma ) {
  var gamma = Math.exp(logOfGamma);
  
  for (var x = 0; x < image.width; x++) {
    for (var y = 0; y < image.height; y++) {
      var pixel = image.getPixel(x, y);

      pixel.data[0] = Math.pow(pixel.data[0], gamma);
      pixel.data[1] = Math.pow(pixel.data[1], gamma);
      pixel.data[2] = Math.pow(pixel.data[2], gamma);

      pixel.clamp();
      image.setPixel(x, y, pixel)
    }
  }

  return image;
}

function edgeFilter( image ) {

  var newImg = image.createImg(image.width, image.height);

  function validate ( x, y ) {
    if (x >= 0 && x < image.width && y >= 0 && y < image.height) {
      return true;
    }
    else return false;
  }

  // 3x3 kernel
  var kernel = [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]];

  for (var x = 0; x < image.width; x++) {
    for (var y = 0; y < image.height; y++) {

      var ulcomp, ucomp, urcomp;
      var lcomp, ccomp, rcomp;
      var llcomp, locomp, lrcomp;
      var elements = 0; // how many elements (besides center) of the kernel used

      var newpix = new Pixel("#000000");

      // comp for component

      // upper left
      if (validate(x - 1, y - 1)) {
        var ulpixel = image.getPixel(x - 1, y - 1);
        var ulcomp = ulpixel.multipliedBy(kernel[0][0]);
        elements++;
        newpix = newpix.plus(ulcomp);
      }

      // upper
      if (validate(x, y - 1)) {
        var upixel = image.getPixel(x, y - 1);
        var ucomp = upixel.multipliedBy(kernel[0][1]);
        elements++;
        newpix = newpix.plus(ucomp);

      }

      // upper right
      if (validate(x + 1, y - 1)) {
        var urpixel = image.getPixel(x + 1, y - 1);
        var urcomp = urpixel.multipliedBy(kernel[0][2]);
        elements++;
        newpix = newpix.plus(urcomp);

      }

      // left
      if (validate(x - 1, y)) {
        var lpixel = image.getPixel(x - 1, y);
        var lcomp = lpixel.multipliedBy(kernel[1][0]);
        elements++;
        newpix = newpix.plus(lcomp);

      }

      // right
      if (validate(x + 1, y)) {
        var rpixel = image.getPixel(x + 1, y);
        var rcomp = rpixel.multipliedBy(kernel[1][2]);
        elements++;
        newpix = newpix.plus(rcomp);

      }

      // lower left
      if (validate(x - 1, y + 1)) {
        var llpixel = image.getPixel(x - 1, y + 1);
        var llcomp = llpixel.multipliedBy(kernel[2][0]);
        elements++;
        newpix = newpix.plus(llcomp);

      }

      // lower
      if (validate(x, y + 1)) {
        var lopixel = image.getPixel(x, y + 1);
        var locomp = lopixel.multipliedBy(kernel[2][1]);
        elements++;
        newpix = newpix.plus(locomp);

      }

      // lower right
      if (validate(x + 1, y + 1)) {
        var lrpixel = image.getPixel(x + 1, y + 1);
        var lrcomp = lrpixel.multipliedBy(kernel[2][2]);
        elements++;
        newpix = newpix.plus(lrcomp);
      }

      // center
      var cpixel = image.getPixel(x, y);

      // "kernel element" for center pixel is based on how
      // many of the other elements have been used
      var ccomp = cpixel.multipliedBy(elements);
      newpix = newpix.plus(ccomp);
      // console.log(newpix);

      // ccomp.plus(lrcomp.plus(locomp.plus(llcomp.plus(rcomp.plus(lcomp.plus(urcomp.plus(ucomp.plus(ulcomp))))))));
      newpix.clamp();
      newImg.setPixel(x, y, newpix);
    }
  }


  image = newImg;
  return image;
}

function preProcess( targetImg, thresh ) {

  // refImg should be (permanently?) defined -> Yes?
  // I think it should be defined after finding the perfect picture?
  // In the mean time, I'm going to use good2 as the model.
  // "We'll piss off the neighbors! In the place to feels the tears
  // The place to lose your fears!" - Zayn originally from One Direction
  // LOLOLOLOLOLOLOL "Pillow talk, my enemy, my ally" -- Zayn
  var refImg = document.createElement("img");
  refImg.src = "images/" + "good2.JPEG"
  refImg.onload = function(){
    refImg = nativeImgToObj(refImg, "good2.JPEG");
    // Code currently doesn't work until edgeImg is implemented
    // But as of right now, the interface has been linked with this bad boy.
  }
  
  var width = targetImg.width;
  var height = targetImg.height;

  // targetImg = histogramMatchFilter(targetImg, refImg, 0.5); // The bug is in histogramMatchFilter Returns a black image.
  // hmm let's get rid of this for a bit? Filter should still work
  targetImg = grayscaleFilter(targetImg);
  targetImg = gammaFilter(targetImg, 0.6);

  // var edgeImg = edgeImg(targetImg);

  var grayscaleBin = [];
  for (var i = 0; i < width; i++) {
    grayscaleBin[i] = [];
  }

  var outputImg = new Image(targetImg.width, targetImg.height);

  // construct cookie cutter
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < height; j++) {
      var grayscalePix = targetImg.getPixel(i, j);
      grayscalePix = grayscalePix.data[0]; // luminance value

      if (grayscalePix > thresh)
        grayscaleBin[i][j] = 1;
      else
        grayscaleBin[i][j] = 0;

    }
  }
  
  // this is just to test our implementation with the regular edge filter
  var edgeImg = edgeFilter(targetImg);
  
  var edgeBin = [];
  for (var i = 0; i < edgeImg.width; i++)
  edgeBin[i] = [];

  for (var i = 0; i < edgeImg.width; i++) {
    for (var j = 0; j < edgeImg.height; j++) {
      if (edgeImg.getPixel(i, j).data[0] > 0.8) // this uses [0-1] (annoying)
        edgeBin[i][j] = 1;
      else
        edgeBin[i][j] = 0;
    }
  }
  
  // Cut cookies
  for (var i = 0; i < targetImg.width; i++) {
    for (var j = 0; j < targetImg.width; j++) {
      var grayscaleBinPix = grayscaleBin[i][j];
      var edgeBinPix = edgeBin[i][j];
      
      // the OR gate is reversed so that we also do the complement in this step
     
      if (grayscaleBinPix || edgeBinPix) {
        outputImg.setPixel(i, j, new Pixel(0, 0, 0));
      }
      
      else {
        outputImg.setPixel(i, j, new Pixel(1, 1, 1));
      }
    }
  }
  
     return outputImg;
  
  
}


