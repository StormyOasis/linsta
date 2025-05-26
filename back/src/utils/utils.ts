import { Like, PostWithCommentCount, Profile } from './types';
import ESConnector, { buildSearchResultSet } from '../Connectors/ESConnector';
import RedisConnector from '../Connectors/RedisConnector';
import DBConnector, { EDGE_USER_FOLLOWS, EDGE_USER_LIKED_POST, EDGE_POST_TO_COMMENT } from '../Connectors/DBConnector';
import logger from '../logger/logger';
import { Context } from 'koa';

export const isUserAuthorized = (ctx: Context, userId: string): boolean => {
    return ctx.state.user?.id === userId;
}

export const getLikesByPost = async (postId: string | null): Promise<Like[]> => {
    if (postId == null || postId.length === 0) {
        return [];
    }

    // Get a list of all users that like the given post id
    const results = await DBConnector.getGraph().V(postId)
        .inE(EDGE_USER_LIKED_POST)
        .outV()
        .project("userId", "userName", "profileId")
        .by(DBConnector.__().id())
        .by("userName")
        .by("profileId")
        .toList();

    if (results == null) {
        throw new Error("Error getting post likes");
    }

    return results.map(result => {
        const data = DBConnector.unwrapResult(result);
        return DBConnector.parseGraphResult<Like>(data, ["userId", "userName", "profileId"]);
    });
}

export const getPostByPostId = async (postId: string): Promise<| { esId: string; post: PostWithCommentCount } | null> => {
    if (!postId?.trim()) {
        return null;
    }

    // Try to pull the postId to ES id mapping from Redis
    let esId: string | null = await RedisConnector.get(postId);
    if (!esId) {
        // If mapping not found in Redis then pull from the graph and set in redis
        const results = await DBConnector.getGraph().V(postId).project("esId").by("esId").toList();

        if (!results || results.length === 0) {
            throw new Error("Error getting post");
        }

        // Store the returned vertex info to return to user
        const vertex = DBConnector.unwrapResult(results[0]);
        const parsed = DBConnector.parseGraphResult<{ esId: string }>(vertex, ["esId"]);

        esId = parsed.esId;

        if (!esId?.trim()) {
            throw new Error("Invalid post id");
        }

        // Add to / update to Redis
        await RedisConnector.set(postId, esId);        
    }

    // esId should now contain the ES id for the given postId
    // Now attempt to pull the full Post object from Redis
    let post: PostWithCommentCount | null = null;
    const cachedData = await RedisConnector.get(esId);
    if (cachedData) {
        post = JSON.parse(cachedData);
    } else {
        // Pull from Elasticsearch if not cached
        const esResults = await ESConnector.getInstance().search(
            {
                bool: {
                    must: [{ match: { _id: esId } }],
                },
            },
            1
        );

        const hits = esResults?.body?.hits?.hits;
        if (!hits || hits.length === 0) {
            throw new Error("Invalid post");
        }
        
        const entries = buildSearchResultSet(hits) as PostWithCommentCount[];
        post = entries[0];
    }

    if (!post) {
        throw new Error("Post not found");
    }

    // Update post with comment count from graph
    const __ = DBConnector.__();
    const commentResults = await DBConnector.getGraph()
        .V(postId)
        .project("commentCount")
        .by(__.outE(EDGE_POST_TO_COMMENT).count())
        .toList();

    if (commentResults?.length > 0) {
        const vertex = DBConnector.unwrapResult(commentResults[0]);
        const parsed = DBConnector.parseGraphResult<{ commentCount: number }>(vertex, ["commentCount"]);
        post.commentCount = parsed.commentCount;
    }

    // Fetch likes and user pfp
    post.global.likes = await getLikesByPost(postId);
    post.postId = postId;
    post.user.pfp = await getPfpByUserId(post.user.userId);

    // Cache full post back into Redis
    await RedisConnector.set(esId, JSON.stringify(post));

    return { esId, post };
}

export const getFollowingUserIds = async (userId: string): Promise<string[]> => {
    try {
        const results = await DBConnector.getGraph()
            .V(userId)
            .out(EDGE_USER_FOLLOWS)
            .toList();

        return results.map(result => {
            const vertex = DBConnector.unwrapResult(result);
            if (vertex instanceof Map) {
                return String(vertex.get("id"));
            } else if (typeof vertex === "object" && vertex !== null && "id" in vertex) {
                return String((vertex as { id: unknown }).id);
            }
            throw new Error("Unexpected vertex format");
        });

    } catch (err) {
        logger.error("Failed to get following user IDs", { userId, error: err });
        return [];
    }
}

export const getProfile = async (userId: string | null, userName: string | null): Promise<Profile | null> => {
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
            return JSON.parse(cached) as Profile;
        }

        // Not found in redis. Need to query DB and ES 
        let results;

        // DB first
        if (userName !== null) {
            results = await DBConnector.getGraph().V().has("userName", userName).next();
        } else {
            results = await DBConnector.getGraph().V(userId).next();
        }

        if (results == null || results.value == null) {
            throw new Error("Invalid user name or id");
        }

        const vertexProperties = results.value.properties;
        const userIdFromResult: string = results.value.id;
        const profileId: string = getVertexPropertySafe(vertexProperties, 'profileId');

        // Now get profile from ES
        results = await ESConnector.getInstance().searchProfile({term: { _id: profileId }}, null);

        const hits = results?.body?.hits?.hits;
        if (!results || results.statusCode !== 200 || hits == null || hits.length === 0) {
            throw new Error("Profile not found");
        }

        // Should only be at most 1 results since we are querying by id
        const source = hits[0]._source as Partial<Profile>;

        const profile: Profile = {
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
    } catch (err) {
        logger.error("Failed to get profile", { userId, userName, error: err });
    }

    return null;
}

export const getVertexPropertySafe = (vertexProperties: Record<string, Array<{ value: string }>> | undefined, 
    propertyName: string, defaultValue: string = ""): string => {
        return vertexProperties?.[propertyName]?.[0]?.value ?? defaultValue;
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

export const getPfpByUserId = async (userId: string): Promise<string> => {
    // Try to pull the pfp from redis first
    const key = `profile:id:${userId}`;
    const cachedData = await RedisConnector.get(key);
    if(cachedData) {
        const profile:Profile = JSON.parse(cachedData);
        if(profile && profile.pfp) {
            return profile.pfp;
        }
    }

    const results = await DBConnector.getGraph().V(userId).next();

    if (results == null || results.value == null || results.value.properties.pfp == null) {
        return "";
    }

    return results.value.properties.pfp[0]['value'];
}

export const addPfpsToPosts = async (posts: Record<string, PostWithCommentCount>) => {
    await Promise.all(Object.values(posts).map(async post => {
        post.user.pfp = await getPfpByUserId(post.user.userId);
    }));
}

export const addCommentCountsToPosts = async (posts: Record<string, PostWithCommentCount>, postIds: string[]) => {
    const __ = DBConnector.__();
    const commentResults = await DBConnector.getGraph().V(postIds)
        .project("postId", "commentCount")
        .by(__.id())
        .by(__.outE(EDGE_POST_TO_COMMENT).count())
        .toList();

    for (const result of commentResults) {
        const data = DBConnector.unwrapResult(result);    
        const parsed = DBConnector.parseGraphResult<{ postId: string; commentCount: number }>(
            data,
            ["postId", "commentCount"]
        );

        if (parsed.postId in posts) {
            posts[parsed.postId].commentCount = parsed.commentCount;
        }
    } 
};

export const addLikesToPosts = async (posts: Record<string, PostWithCommentCount>, postIds: string[]) => {
    const __ = DBConnector.__();
    const likeResults = await DBConnector.getGraph().V(postIds)
        .filter(__.inE(EDGE_USER_LIKED_POST).count().is(DBConnector.P().gt(0)))
        .project("postId", "users")
        .by(__.id())
        .by(__.inE(EDGE_USER_LIKED_POST)
            .outV()
            .project('profileId', 'userName', 'pfp', 'firstName', 'lastName', 'userId')
            .by("profileId")
            .by("userName")
            .by("pfp")
            .by("firstName")
            .by("lastName")
            .by(__.id())
            .fold())
        .toList();

    for (const result of likeResults) {
        const data = DBConnector.unwrapResult(result);
        const parsed = DBConnector.parseGraphResult<{ postId: string; users: unknown[] }>(data, ["postId", "users"]);

        const { postId, users } = parsed;

        if (!posts[postId]) {
            continue;
        }

        const post = posts[postId];
        post.global.likes = [];

        for (const user of users ?? []) {
            const userData = DBConnector.unwrapResult(user);
            const userParsed = DBConnector.parseGraphResult<Like>(userData, [
                "userName",
                "userId",
                "profileId",
                "firstName",
                "lastName",
                "pfp"
            ]);

            post.global.likes.push({
                userName: userParsed.userName,
                userId: userParsed.userId,
                profileId: userParsed.profileId,
                firstName: userParsed.firstName,
                lastName: userParsed.lastName,
                pfp: userParsed.pfp
            });
        }
    }
};

// Helper function to validate and return errors
export const handleValidationError = (ctx: Context, message: string, statusCode: number = 400) => {
    ctx.status = statusCode;
    ctx.body = { status: message };
};

export const buildPostSortClause = () => [
    {
        "global.dateTime": {
            order: "asc",
            nested: { path: "global" },
            mode: "min"
        }
    },
    {
        "media.postId": {
            order: "asc",
            nested: { path: "media" },
            mode: "min"
        }
    }
];