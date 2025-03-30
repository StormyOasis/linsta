import sanitizeHtml from 'sanitize-html';
import { Like, Post, Profile } from './types';
import { buildSearchResultSet, search, searchProfile } from '../Connectors/ESConnector';
import RedisConnector from '../Connectors/RedisConnector';
import DBConnector, { EDGE_USER_LIKED_POST } from '../Connectors/DBConnector';
import logger from '../logger/logger';
import { Context } from 'koa';

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

export const sanitizeInput = (input?: string | null): string => sanitize(input || "");

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

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

export const getPostIdFromEsId = async (esId: string):Promise<string|null> => {    
    // Get a list of all users that like the given post id
    const result = await DBConnector.getGraph().V()
        .hasLabel("Post")          
        .has("esId", esId)
        .project("id")
        .by(DBConnector.__().id())
        .next();    

    if(result == null) {
        throw new Error("Error getting post likes");
    }

    if(result.value === null) {
        return null;
    }

    return result.value.get("id");
}

export const getLikesByPost = async (postId: string):Promise<Like[]> => {
    if(postId == null || postId.length === 0) {
        return [];
    }

    const output:Like[] = [];

    // Get a list of all users that like the given post id
    const result = await DBConnector.getGraph().V(postId)
        .inE(EDGE_USER_LIKED_POST)
        .outV()
        .project("userId", "userName", "profileId")
        .by(DBConnector.__().id())
        .by("userName")
        .by("profileId")            
        .toList();    

    if(result == null) {
        throw new Error("Error getting post likes");
    }

    for (const vertex of result) {
        // Store the returned vertex info to return to user
        // There HAS to be a less hacky feeling way to do this but I'm not sure
        const props = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const propertyIter = (vertex as Map<any, any>).entries();
        let property = propertyIter.next();
        
        while(!property.done) {                
            props.push(property.value[1]);
            property = propertyIter.next();
        }

        output.push({
            userId: props[0],
            userName: props[1],
            profileId: props[2]
        })
    }

    return output;
}

export const getPostByPostId = async (postId: string):Promise<|{esId: string; post:Post}|null> => {
    let esId: string = "";

    // Try to pull the postId to ES id mapping from Redis
    const postIdToESIdMapping:string|null = await RedisConnector.get(postId);
    if(!postIdToESIdMapping) {
        // If mapping not found in Redis then pull from the graph and set in redis
        const result = await DBConnector.getGraph().V(postId).project("esId").by("esId").toList();

        if(result == null) {
            throw new Error("Error getting post");
        }    

        // Store the returned vertex info to return to user
        // There HAS to be a less hacky feeling way to do this but I'm not sure            
        for (const vertex of result) {            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const propertyIter = (vertex as Map<any, any>).entries();
            let property = propertyIter.next();
            
            while(!property.done) {
                esId = (property.value[1]);
                property = propertyIter.next();
            }            
        }
    } else {
        esId = postIdToESIdMapping;
    }

    if(esId == null || esId.length === 0) {
        throw new Error("Invalid post id");
    }

    // Add to / update to Redis
    await RedisConnector.set(postId, esId); 
    
    // esId should now contain the ES id for the given postId
    // Now attempt to pull the full Post object from Redis

    const data = await RedisConnector.get(esId);
    let entries:Post[] = [];
    if(data) {
        entries[0] = JSON.parse(data);
    } else {
        // Pull Post data from ES

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results:any = await search({
            bool: {
                must: [{
                    match: {_id: esId}                    
                }]
            }
        }, 1);
        
        entries = buildSearchResultSet(results.body.hits.hits);
        if(entries.length === 0) {
            throw new Error("Invalid post");
        }
    }

    // Get post likes
    entries[0].global.likes = await getLikesByPost(postId);
    entries[0].postId = postId;
    entries[0].user.pfp = await getPfpByUserId(entries[0].user.userId);

    // Add to Redis
    await RedisConnector.set(esId, JSON.stringify(entries[0]));    

    return {esId, post: entries[0]};
}

export const getProfileByUserId = async (userId: string):Promise<Profile|null> => {
    return await getProfileEx(userId, null);
}

export const getProfileByUserName = async (userName: string):Promise<Profile|null> => {
    return await getProfileEx(null, userName);
}

const getProfileEx = async (userId: string|null, userName: string|null):Promise<Profile|null> => {
    if(userId == null && userName == null) {
        return null;
    }

    // Build the redis key based on if searching by user name or by user id
    const key = `profile:${userId != null ? 'id' : 'name'}:${userId != null ? userId : userName}`;

    try {
    
        // Attempt to pull from redis first
        const res = await RedisConnector.get(key);
        if(res !== null) {
            // Found in redis
            return JSON.parse(res) as Profile;
        }

        // Not found in redis. Need to query DB and ES 
        let results;

        // DB first
        if(userName !== null) {
            results = await DBConnector.getGraph().V().has("userName", userName).next(); 
        } else {
            results = await DBConnector.getGraph().V(userId).next();
        }

        if(results == null || results.value == null) {
            throw new Error("Invalid user name or id");
        }
        
        const vertexProperties = results.value.properties;
        const userIdFromResult:string = results.value.id;
        const profileId:string = getVertexPropertySafe(vertexProperties, 'profileId');
        
        // Now get profile from ES
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results = await searchProfile({            
            "term": {
                "_id": profileId
            }            
        }, null);

        const hits = results?.body?.hits?.hits;
        if(results.statusCode !== 200 || hits == null) {
            throw new Error("Error querying ES");
        }
        
        // Should only be at most 1 results since we are querying by id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const source:any = hits[0]._source;
        
        const profile:Profile = {
            userId: userIdFromResult,
            profileId: profileId,            
            userName: getVertexPropertySafe(vertexProperties, 'userName'),
            pronouns: getVertexPropertySafe(vertexProperties, 'pronouns'),
            pfp: getVertexPropertySafe(vertexProperties, 'pfp'),
            bio: getVertexPropertySafe(vertexProperties, 'bio'),
            gender: getVertexPropertySafe(vertexProperties, 'gender'),
            firstName: getVertexPropertySafe(vertexProperties, 'firstName', source.firstName),
            lastName: getVertexPropertySafe(vertexProperties, 'lastName', source.lastName),
            link: getVertexPropertySafe(vertexProperties, 'link')
        };

        // Inverse key used to update the other copy of profile stored in redis
        const inverseKey = `profile:${userName != null ? 'id' : 'name'}:${userName != null ? profile.userId : profile.userName}`;
        
        // Add to redis. Store the profile under both the userId and userName(hence inverseKey var)    
        const profileString = JSON.stringify(profile);
        await RedisConnector.set(key, profileString);
        await RedisConnector.set(inverseKey, profileString);

        return profile;
    } catch(err) {
        console.log(err);
        logger.error(err);    
    }
    
    return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getVertexPropertySafe = (vertexProperties: any, propertyName: string, defaultValue: string = ""): string => {
    return vertexProperties[propertyName]?.[0]?.value ?? defaultValue;
};

export const updateProfileInRedis = async (profile: Profile) => {
    // Build the redis key based on if searching by user name or by user id
    const key = `profile:id:${profile.userId}`;

    // Inverse key used to update the other copy of profile stored in redis
    const inverseKey = `profile:name:${profile.userName}`;
    
    // Add to redis. Store the profile under both the userId and userName(hence inverseKey var)    
    const profileString = JSON.stringify(profile);
    await RedisConnector.set(key, profileString);
    await RedisConnector.set(inverseKey, profileString);    
}

export const getPfpByUserId = async (userId: string):Promise<string> => {
    const results = await DBConnector.getGraph().V(userId).next();

    if(results == null || results.value == null || results.value.properties.pfp == null) {
        return "";
    }

    return results.value.properties.pfp[0]['value'];
}

// Helper function to validate and return errors
export const handleValidationError = (ctx: Context, message: string, statusCode: number = 400) => {
    ctx.status = statusCode;
    ctx.body = { status: message };
};