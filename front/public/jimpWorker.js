// eslint-disable-next-line no-undef
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

const extractMimeTypeFromBase64 = (data) => {
  if(data == null || data.length === 0) {
      return null;
  }        

  return data.substring(5, data.indexOf(';') + 1);
}

self.addEventListener("message", (e) => {
  const data = e.data.data;
  const mimeType = extractMimeTypeFromBase64(data);
  const blob = base64ToBlob(data.substring(data.indexOf(',') + 1), mimeType, null);    
  const url = URL.createObjectURL(blob);

  // eslint-disable-next-line no-undef
  Jimp.read(url).then((img) => {
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

    URL.revokeObjectURL(url);

    img.getBase64(img._originalMime, (err, src) => {
      if (err) {
        throw new Error(err);
      }
      self.postMessage({
        data: src
      });
    });
  }).catch((err) => console.error(err))
});