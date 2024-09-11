import sanitizeHtml from 'sanitize-html';

export const isEmail = (str: string) : boolean => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return emailRegex.test(str);
}

export const isPhone = (str: string): boolean => {
    const phoneRegex = /(?:([+]\d{1,4})[-.\s]?)?(?:[(](\d{1,3})[)][-.\s]?)?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9})/g;
    return phoneRegex.test(str);
}

export const isValidPassword = (str: string): boolean => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&^])[A-Za-z\d@.#$!%*?&]{8,15}$/;

    return regex.test(str);    
}

export const obfuscateEmail = (email: string):string => {
    if(email == null) {
        return "";
    }

    const indexOfAt = email.indexOf("@");
    const starCount = indexOfAt - 2;
    return `${email.at(0)}${"*".repeat(starCount)}${email.at(indexOfAt - 1)}@${email.substring(indexOfAt + 1)}`;
}

export const obfuscatePhone = (phone: string):string => {
    if(phone == null) {
        return "";
    }

    const maxLength = phone.length;
    const starLength = maxLength - 5;
    return `${phone.substring(0,3)}${"*".repeat(starLength)}${phone.substring(maxLength - 2)}`;
}

export const sanitize = (html: string):string => {
    return sanitizeHtml(html, {
        allowedTags: ['b', 'i', 'a', 'strong', 'br'],
        allowedAttributes: {
            'a': ['href']
        },
    });
}

export const getFileExtByMimeType = (mimeType: string|null):string => {
    switch(mimeType) {
        case "image/jpeg": {
            return ".jpg";
        }
        case "video/mp4": {
            return ".mp4";
        }
        default: {
            throw new Error("Unknown mime type");
        }
    }
}