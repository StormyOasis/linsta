importScripts("https://cdn.jsdelivr.net/npm/jimp@0.22.12/browser/lib/jimp.min.js");

const base64ToBlob = (base64String, contentType, outFileName) => {
  const sliceSize = 512;

  var byteCharacters = atob(base64String);
  var byteArrays = [];

  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);

    var byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    var byteArray = new Uint8Array(byteNumbers);

    byteArrays.push(byteArray);
  }

  return new File(byteArrays, outFileName, { type: contentType });
}

self.addEventListener("message", (e) => {
  Jimp.read(e.data.url).then((img) => {
    switch(e.data.type) {
      case "brightness": {
        img.brightness(e.data.value)
        break;
      }
      case "contrast": {
        img.contrast(e.data.value)
        break;
      }
      case "greyscale": {
        if(e.data.value === 1) {
          img.greyscale();
        }
        break;
      }
      case "invert": {
        if(e.data.value === 1) {
          img.invert();
        }
        break;
      }
      case "blur": {
        img.blur(e.data.value);
        break;
      }      
      case "sepia": {
        if(e.data.value === 1) {
          img.sepia();
        }
        break;
      }
      case "pixelate": {
        img.pixelate(e.data.value);
        break;
      }             
    }


    img.getBase64(img._originalMime, (err, src) => {
      if (err) {
        throw new Error(err);
      }
      self.postMessage({
        prevUrl: e.data.url,
        newUrl: URL.createObjectURL(
          base64ToBlob(src.substring(src.indexOf(',') + 1), img._originalMime, e.data.url))
      });
    });
  }).catch((err) => console.error(err))
});