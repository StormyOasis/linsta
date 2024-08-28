export type HistoryType = {
    navigate: any,
    location: any,
    isServer: boolean
};

export const historyUtils:HistoryType = {
    navigate: null,
    location: null,
    isServer: true
}

export const validatePassword = (value: string): boolean => {
    const regex:RegExp =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&^])[A-Za-z\d@.#$!%*?&]{8,15}$/;
        
    return regex.test(value);
};

export const validateEmailPhone = (value: string): boolean => {
    if (value == null) {
        return false;
    }

    const phoneRegex = /(?:([+]\d{1,4})[-.\s]?)?(?:[(](\d{1,3})[)][-.\s]?)?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9})/g;
    const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return emailRegex.test(value) || phoneRegex.test(value);
};

export const validateFullName = (value: string): boolean => {
    return (
        value !== null &&
        value.trim().length > 0 &&
        value.trim().split(" ").length > 1
    );
};

export const isVideoFileFromPath = (path: string): boolean => {
    if(path == null || path.trim().length < 4) {
        throw new Error("Invalid path");
    }

    const validVideoExtentions:string[] = ["avif", "ogm", "wmv", "mpg", "webm", "ogv", "mov", "asx", "mpeg", "mp4", "m4v", "avi"];
    const ext = path.toLowerCase().substring(path.lastIndexOf(".") + 1);
    
    return validVideoExtentions.includes(ext);    
}

export const isVideoFileFromType = (type: string): boolean => {
    if(type == null || type.trim().length < 4) {
        throw new Error("Invalid type");
    }
        
    return type.toLowerCase().includes("video");
}

export const base64ToBlob = (base64String, contentType, outFileName) => {
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