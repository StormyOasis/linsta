import DBConnector, { EDGE_USER_LIKED_POST } from './connectors/DBConnector';
import { buildSearchResultSet } from './connectors/elastic/ESConnector';
import { IndexService } from './connectors/elastic/IndexService';
import { SearchService } from './connectors/elastic/SearchService';
import RedisConnector from './connectors/RedisConnector';
import logger from './logger';
import { Like, Post, Profile, ProfileWithFollowStatus } from './types';

// Helper function to validate and return errors
export const handleValidationError = (error: string, statusCode: number = 400) => {
    logger.info(`Failure: Code ${statusCode} ${error} `);
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': "true"
        },
        body: JSON.stringify({
            data: error,
            statusText: "FAIL",
            status: statusCode
        })
    }
};

export const handleSuccess = (result: unknown) => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': "true"
        },
        body: JSON.stringify({
            data: result,
            statusText: "OK",
            status: 200
        })
    };
};

export const mapToObjectDeep = (value: unknown): unknown => {
    if (value instanceof Map) {
        const obj: Record<string, unknown> = {};
        for (const [key, val] of value.entries()) {
            obj[key] = mapToObjectDeep(val);
        }
        return obj;
    }

    if (Array.isArray(value)) {
        return value.map(mapToObjectDeep);
    }

    if (typeof value === 'object' && value !== null) {
        const obj: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            obj[key] = mapToObjectDeep(val);
        }
        return obj;
    }

    return value;
}

export const getEsIdFromGraph = async (isTransaction: boolean, id: string): Promise<string | null> => {
    const results = await (await DBConnector.getGraph(isTransaction)).V(id).project("esId").by("esId").toList();
    if (!results?.length) {
        return null;
    }

    const vertex = DBConnector.unwrapResult(results[0]);
    const parsed = DBConnector.parseGraphResult<{ esId: string }>(vertex, ["esId"]);

    return parsed.esId?.trim() || null;
}

export const getPostFromCacheOrES = async (esId: string): Promise<Post | null> => {
    const cached = await RedisConnector.get(esId);
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch {
            logger.warn(`Failed to parse cached post data for esId ${esId}`);
        }
    }

    const esResults = await SearchService.searchPosts(
        { query: {bool: { must: [{ match: { _id: esId } }] } } } as any,
        1
    );

    const hits = (esResults as any)?.hits?.hits;
    if (!hits?.length) {
        return null;
    }

    const posts: Post[] = buildSearchResultSet(hits) as Post[];
    return posts[0] || null;
}

export const getLikesByPost = async (isTransaction: boolean, postId: string | null): Promise<Like[]> => {
    if (postId == null || postId.length === 0) {
        return [];
    }

    // Get a list of all users that like the given post id
    const results = await (await DBConnector.getGraph(isTransaction)).V(postId)
        .inE(EDGE_USER_LIKED_POST)
        .outV()
        .project("userId", "userName", "profileId")
        .by(DBConnector.__().id())
        .by("userName")
        .by("profileId")
        .toList();

    if (!results) {
        throw new Error("Error getting post likes");
    }

    return results.map(result => {
        const data = DBConnector.unwrapResult(result);
        return DBConnector.parseGraphResult<Like>(data, ["userId", "userName", "profileId"]);
    });
}

export const getPfpByUserId = async (isTransaction: boolean, userId: string): Promise<string> => {
    const forcedUserIdToString = `${userId}`;
    if (!forcedUserIdToString?.trim()) {
        return "";
    }

    const redisKey = `profile:id:${forcedUserIdToString}`;

    try {
        // Try Redis cache first
        const cachedData = await RedisConnector.get(redisKey);
        if (cachedData) {
            try {
                const profile: Profile = JSON.parse(cachedData);
                if (profile?.pfp) {
                    return profile.pfp;
                }
            } catch (err) {
                logger.warn(`Failed to parse cached profile for user ${forcedUserIdToString}`, err);
            }
        }

        // Fallback to Gremlin query
        const result = await (await DBConnector.getGraph(isTransaction)).V(forcedUserIdToString).valueMap(true).toList();
        if (!result?.length) {
            return "";
        }

        const vertex = DBConnector.unwrapResult(result[0]);
        const parsed = DBConnector.parseGraphResult<{ pfp: string }>(vertex, ["pfp"]);

        return parsed.pfp || "";
    } catch (err) {
        logger.error(`Error getting profile picture for userId ${forcedUserIdToString}`, err);
        return "";
    }
};

export const getPostByPostId = async (isTransaction: boolean, postId: string): Promise<{ esId: string; post: Post } | null> => {
    const enforcedPostId = `${postId}`;

    if (!enforcedPostId || enforcedPostId?.trim().length === 0) {
        return null;
    }

    try {
        let esId = await RedisConnector.get(enforcedPostId);

        if (!esId) {
            esId = await getEsIdFromGraph(isTransaction, enforcedPostId);
            if (!esId) {
                throw new Error("Invalid or missing ES Id for post");
            }

            await RedisConnector.set(enforcedPostId, esId);
        }

        let post = await getPostFromCacheOrES(esId);
        if (!post) {
            throw new Error("Post not found");
        }

        post.postId = enforcedPostId;
        post.global.commentCount = await DBConnector.getCommentCount(isTransaction, enforcedPostId);
        post.global.likes = await getLikesByPost(isTransaction, enforcedPostId);
        post.user.pfp = await getPfpByUserId(isTransaction, post.user.userId);

        await RedisConnector.set(esId, JSON.stringify(post));

        return { esId, post };
    } catch (err) {
        logger.error(`Failed to retrieve post for id ${enforcedPostId}`, err);
        throw new Error("Error getting post");
    }
};

export const getProfile = async (userId: string | null, userName: string | null): Promise<ProfileWithFollowStatus | null> => {
    if (!userId && !userName) {
        return null;
    }

    // Build the redis key based on if searching by user name or by user id
    const key = `profile:${userId != null ? 'id' : 'name'}:${userId != null ? userId : userName}`;

    try {
        // Attempt to pull from redis first
        const cached = await RedisConnector.get(key);
        if (cached) {
            // Found in redis
            return JSON.parse(cached) as ProfileWithFollowStatus;
        }

        // Not found in redis. Need to query DB and ES 

        // DB first
        const graph = await DBConnector.getGraph();
        const results = userName != null
            ? await graph.V().has('userName', userName).next()
            : await graph.V(userId).next();

        if (!results?.value) {
            throw new Error("Invalid user name or id");
        }

        const vertexProperties = results.value.properties;
        const userIdFromResult: string = results.value.id;
        const profileId: string = DBConnector.getVertexPropertySafe(vertexProperties, 'profileId');

        // Now get profile from ES
        const esResult = await SearchService.searchProfiles({ query: { term: { _id: profileId } } });

        const hits = (esResult as any)?.hits?.hits;
        if (!esResult || hits == null || hits.length === 0) {
            throw new Error("Profile not found");
        }

        // Should only be at most 1 results since we are querying by id
        const source = hits[0]._source as Partial<Profile>;

        const profile: ProfileWithFollowStatus = {
            userId: userIdFromResult,
            profileId: profileId,
            userName: DBConnector.getVertexPropertySafe(vertexProperties, 'userName'),
            pronouns: DBConnector.getVertexPropertySafe(vertexProperties, 'pronouns'),
            pfp: DBConnector.getVertexPropertySafe(vertexProperties, 'pfp'),
            bio: DBConnector.getVertexPropertySafe(vertexProperties, 'bio'),
            gender: DBConnector.getVertexPropertySafe(vertexProperties, 'gender'),
            firstName: DBConnector.getVertexPropertySafe(vertexProperties, 'firstName', source.firstName),
            lastName: DBConnector.getVertexPropertySafe(vertexProperties, 'lastName', source.lastName),
            link: DBConnector.getVertexPropertySafe(vertexProperties, 'link'),
            isFollowed: false
        };

        // Inverse key used to update the other copy of profile stored in redis
        const inverseKey = `profile:${userName != null ? 'id' : 'name'}:${userName != null ? userIdFromResult : profile.userName}`;

        // Add to redis. Store the profile under both the userId and userName(hence inverseKey var)    
        const profileString = JSON.stringify(profile);
        await RedisConnector.set(key, profileString);
        await RedisConnector.set(inverseKey, profileString);

        return profile;
    } catch (err) {
        logger.error("Failed to get profile", { userId, userName, error: err });
    }

    return null;
}

export const updateEntryUrl = async (postEsId: string, entryId: string, mimeType: string, newUrl: string) => {
    // We need to change the media url in ES and possibly redis
    const params: Record<string, unknown> = {
        newUrl,
        mimeType,
        entryId
    };

    // Update ES first, it's the source of truth 
    const esResult = await IndexService.updatePost(postEsId, {
        source:
            `
            // Update the url and mime-type media items using entry id matching
            if (ctx._source.containsKey('media')) {                    
                int mediaSize = ctx._source.media.size();     
                
                // Iterate through the media array and update the altText
                for (int i = 0; i < mediaSize; i++) {
                    if (ctx._source.media[i].id == params.entryId) {
                        ctx._source.media[i].path = params.newUrl;
                        ctx._source.media[i].mimeType = params.mimeType;
                        break;
                    }
                }
            }
        `,
        "params": params,
        "lang": "painless"
    }, true);

    if (!esResult || esResult?.result !== "updated") {
        throw new Error("Failed to update url in ES");
    }

    // Now update Redis(if necessary)
    const cached = await RedisConnector.get(postEsId);
    if (cached) {
        // Found in Redis, update the mime-type and url        
        try {
            const post: Post = JSON.parse(cached) as Post;
            for (const entry of post.media) {
                if (entry.id == params.entryId) {
                    entry.mimeType = mimeType;
                    entry.url = newUrl;
                    break;
                }
            }
            await RedisConnector.set(postEsId, JSON.stringify(post));
        } catch {
            logger.warn(`Failed to update cached post data for esId ${postEsId}`);
        }
    }
}

export const getFileExtension = (url: string) => {
    try {
        // Remove query parameters or hash fragments
        const cleanUrl = url.split(/[?#]/)[0];

        // Extract the file extension
        const parts:string[] = cleanUrl.split('.');
        return parts.length > 1 ? parts.pop()?.toLowerCase() : null;
    } catch (error) {
        return null;
    }
}

export const getFileExtByMimeType = (mimeType: string | null): string => {
    switch (mimeType) {
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

export const updateProfileInRedis = async (profile: Profile, userId: string) => {
    if (!profile || !userId) {
        throw new Error("Invalid params to Redis");
    }

    // Build the redis key based on if searching by user name or by user id
    const key = `profile:id:${userId}`;
    // Inverse key used to update the other copy of profile stored in redis
    const inverseKey = `profile:name:${profile.userName}`;
    const profileString = JSON.stringify(profile);

    // Add to redis. Store the profile under both the userId and userName(hence inverseKey var)    
    await RedisConnector.set(key, profileString);
    await RedisConnector.set(inverseKey, profileString);
};