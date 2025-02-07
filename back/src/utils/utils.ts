import sanitizeHtml from 'sanitize-html';
import { Post } from './types';
import { buildSearchResultSet, search } from '../Connectors/ESConnector';
import RedisConnector from '../Connectors/RedisConnector';

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
        allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'br', 'sub', 'sup' ],
        allowedAttributes: {
            'a': ['href']
        },
    }).trim();
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

export interface RedisInfo {
    [key: string]: any;
};

export const parseRedisInfo = (infoString: string): RedisInfo => {
    const info: RedisInfo = {};

    const lines = infoString.split('\r\n');
    for (let i = 0; i < lines.length; ++i) {
        const parts = lines[i].split(':');
        if (parts[1]) {
            info[parts[0]] = parts[1];
        }
    }
    return info;
};

export const getPostById = async (postId: string):Promise<Post|null> => {
    // Attempt to pull from redis first
    const result = await RedisConnector.get(postId);
    if(result !== null) {
        // Found in redis
        return JSON.parse(result) as Post;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results:any = await search({
        bool: {
            must: [{
                match: {_id: postId}                    
            }]
        }
    }, null);

    const entries:Post[] = buildSearchResultSet(results.body.hits.hits);
    if(entries.length === 0) {
        throw new Error("Post not found");
    }

    // add to redis
    await RedisConnector.set(postId, JSON.stringify(entries[0]));
    
    return entries[0];
}