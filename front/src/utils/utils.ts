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

export const base64ToBlob = (base64String: string, outFileName: string):File|null => {
    if(base64String === null || base64String.length === 0)
        return null;

    const contentType = base64String.substring(5, base64String.indexOf(';'));
    const data = base64String.substring(base64String.indexOf(",") + 1);

    return base64ToBlobEx(data, contentType, outFileName);
}

export const base64ToBlobEx = (base64String: string, contentType: string, outFileName: string) => {
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

export const blobToBase64 = async (blob:any) => {
    blob = await createBlob(blob);
    
    return new Promise((resolve, _reject) => {
        const reader = new FileReader();        
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });    
}

export const createBlob = async (url: string) => {
    const response = await fetch(url);
    const data = await response.blob();
    return data;
}

// Taken from: https://phuoc.ng/collection/html-dom/get-or-set-the-cursor-position-in-a-content-editable-element/
export const getCECursorPosition = (element: HTMLDivElement|null) => {
    const selection = window.getSelection();
    if(element === null || selection === null) {
        return 0;
    }

    const range = selection.getRangeAt(0);
    const clonedRange = range.cloneRange();
    clonedRange.selectNodeContents(element);
    clonedRange.setEnd(range.endContainer, range.endOffset);
    
    return clonedRange.toString().length;    
}

export const createRange = (node: any, targetPosition: number) => {
    let range = document.createRange();
    range.selectNode(node);
    range.setStart(node, 0);

    let pos = 0;
    const stack = [node];
    while (stack.length > 0) {
        const current = stack.pop();

        if (current.nodeType === Node.TEXT_NODE) {
            const len = current.textContent.length;
            if (pos + len >= targetPosition) {
                range.setEnd(current, targetPosition - pos);
                return range;
            }
            pos += len;
        } else if (current.childNodes && current.childNodes.length > 0) {
            for (let i = current.childNodes.length - 1; i >= 0; i--) {
                stack.push(current.childNodes[i]);
            }
        }
    }

    // The target position is greater than the
    // length of the contenteditable element.
    range.setEnd(node, node.childNodes.length);
    return range;
};

export const setCEPosition = (element: HTMLDivElement|null, targetPosition: number) => {
    if(element === null) {
        return;
    }
    const range = createRange(element, targetPosition);    
    const selection = window.getSelection();
    
    selection?.removeAllRanges();
    selection?.addRange(range);  
    selection?.removeAllRanges();  
};

export const setCursorEditable = (editableElem, position) => {
    let range = document.createRange();
    let sel = window.getSelection();
    range.setStart(editableElem.childNodes[0], position);
    range.collapse(true);
  
    sel?.removeAllRanges();
    sel?.addRange(range);
    editableElem.focus();
  }

export const setCursorAtNodePosition = (node, index) => {
    let range = document.createRange();
    let selection = window.getSelection();
    let currentPos = 0;
    let found = false;
  
    const searchNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (currentPos + node.length >= index) {
          range.setStart(node, index - currentPos);
          range.collapse(true);
          found = true;
        } else {
          currentPos += node.length;
        }
      } else {
        for (let child of node?.childNodes) {
          if (found) break;
          searchNode(child);
        }
      }
    }
  
    searchNode(node);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }