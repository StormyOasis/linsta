import sanitizeHtml from 'sanitize-html';
import { Post, Profile } from './types';
import { buildSearchResultSet, search, searchProfile } from '../Connectors/ESConnector';
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
        case "image/png": {
            return ".png";
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

export const getProfileByUserIdEx = async (userId: string):Promise<Profile|null> => {
    return getProfile(userId, null);
}

export const getProfileByUserNameEx = async (userName: string):Promise<Profile|null> => {
    return getProfile(null, userName);
}

const getProfile = async (userId: string|null, userName: string|null):Promise<Profile|null> => {
    if(userId === null && userName === null) {
        return null;
    }

    // Build the redis key based on if searching by user name or by user id
    const key = `profile:${userId != null ? 'id' : 'name'}:${userId != null ? userId : userName}`;

    // Attempt to pull from redis first
    const res = await RedisConnector.get(key);
    if(res !== null) {
        // Found in redis
        return JSON.parse(res) as Profile;
    }

    // Not found in redis. Need to query ES
    let results;

    if(userName !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results = await searchProfile({
            bool: {
                must: {
                  match :{
                    userName: userName
                  }
                }
              }
        }, null);

        if(results.body.hits.hits.length !== 1) {
            throw new Error("Invalid user name");
        }         
    } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results = await searchProfile({
            bool: {
                must: {
                  match :{
                    userId: userId
                  }
                }
              }
        }, null);

        if(results.body.hits.hits.length !== 1) {
            throw new Error("Invalid user id");
        }
    }

    const profile:Profile = results.body.hits.hits[0]._source as Profile;
    profile.id =  results.body.hits.hits[0]._id as string;
    
    // Inverse key used to update the other copy of profile stored in redis
    const inverseKey = `profile:${userName != null ? 'id' : 'name'}:${userName != null ? profile.userId : profile.userName}`;
    
    // Add to redis. Store the profile under both the userId and userName(hence inverseKey var)    
    await RedisConnector.set(key, JSON.stringify(profile));
    await RedisConnector.set(inverseKey, JSON.stringify(profile));
 
    return profile;
}

export const updateProfileInRedis = async (profile: Profile) => {
    // Build the redis key based on if searching by user name or by user id
    const key = `profile:id:${profile.userId}`;

    // Inverse key used to update the other copy of profile stored in redis
    const inverseKey = `profile:name:${profile.userName}`;
    
    // Add to redis. Store the profile under both the userId and userName(hence inverseKey var)    
    await RedisConnector.set(key, JSON.stringify(profile));
    await RedisConnector.set(inverseKey, JSON.stringify(profile));    
}