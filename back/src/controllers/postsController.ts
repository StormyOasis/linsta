import { Context } from "koa";
import config from 'config';
import formidable from 'formidable';
import Metrics from "../metrics/Metrics";
import logger from "../logger/logger";
import { extractFromMultipleTexts, getFileExtByMimeType, getFollowingUserIds, getLikesByPost, getPfpByUserId, getPostByPostId, handleValidationError, sanitize, sanitizeInput } from "../utils/utils";
import { uploadFile } from "../Connectors/AWSConnector";
import ESConnector, { buildDataSetForES } from '../Connectors/ESConnector';
import { User, Global, Entry, Post, PostWithCommentCount, Like } from "../utils/types";
import RedisConnector from "../Connectors/RedisConnector";
import DBConnector, { EDGE_COMMENT_TO_POST, EDGE_POST_LIKED_BY_USER, EDGE_POST_TO_COMMENT, EDGE_POST_TO_USER, EDGE_USER_LIKED_POST, EDGE_USER_TO_POST } from "../Connectors/DBConnector";

export const addPost = async (ctx: Context) => {
    Metrics.increment("posts.addPost");

    const data = ctx.request.body;
    const files = ctx.request.files;

    if (!data || !files) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    const user: User = JSON.parse(data.user);
    const global: Global = JSON.parse(data.global);
    const entries: Entry[] = JSON.parse(data.entries);

    const userIdFromJWT = ctx.state.user.id;
    // Check if the logged-in user is trying to access their own data
    if (userIdFromJWT != user.userId) {
        // 403 - Forbidden
        return handleValidationError(ctx, "You do not have permission to access this data", 403);
    }

    // strip out any potentially problematic html tags
    user.userId = sanitize(user.userId);
    global.captionText = sanitize(global.captionText);
    global.locationText = sanitize(global.locationText);

    try {
        // Upload each file to s3
        for (const entry of entries) {
            const file: formidable.File = (files[entry.id] as formidable.File);

            const result = await uploadFile(file, entry.id, user.userId, getFileExtByMimeType(file.mimetype));
            entry.entityTag = result.tag.replace('"', '').replace('"', '');
            entry.url = result.url;
            entry.mimeType = file.mimetype;
            entry.alt = sanitize(entry.alt);
            entry.userId = user.userId;
        }

        // Now add the data to ES
        const dataSet = buildDataSetForES(user, global, entries);

        const esResult = await ESConnector.getInstance().insert(dataSet);
        if (!esResult || esResult.result !== 'created') {
            return handleValidationError(ctx, "Error adding post");
        }

        // Now add an associated vertex and edges to the graph for this post
        await DBConnector.beginTransaction();

        // Now add a post vertex to the graph
        let graphResult = await DBConnector.getGraph(true)
            .addV("Post")
            .property("esId", esResult._id)
            .next();

        if (graphResult == null || graphResult.value == null) {
            return handleValidationError(ctx, "Error adding post");
        }

        const postId: string = graphResult.value.id;

        // Now add the edges between the post and user verticies            
        graphResult = await DBConnector.getGraph(true).V(postId)
            .as('post')
            .V(user.userId)
            .as('user')
            .addE(EDGE_POST_TO_USER)
            .from_("post")
            .to("user")
            .addE(EDGE_USER_TO_POST)
            .from_("user")
            .to("post")
            .next();

        if (graphResult == null || graphResult.value == null) {
            return handleValidationError(ctx, "Error creating profile links");
        }

        // Update the media entries with the postId for easier
        // and faster lookup. First update in ES
        await ESConnector.getInstance().update(esResult._id, {
            source:
                `for (int i = 0; i < ctx._source.media.size(); i++) {
                    ctx._source.media[i].postId = params.postId;
                }
            `,
            "params": {
                "postId": `${postId}`
            },
            "lang": "painless"
        });

        // Now update the data set that is put into redis adding the postId

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dataSet as any).media = entries.map((entry: Entry) => {
            const newData = { ...entry };
            newData.postId = postId;
            return newData;
        });

        await DBConnector.commitTransaction();

        // Finally add the post data to redis
        await RedisConnector.set(esResult._id, JSON.stringify(dataSet));

    } catch (err) {
        await DBConnector.rollbackTransaction();
        logger.error(err);
        return handleValidationError(ctx, "Error adding post");
    }

    ctx.status = 200;
}

type DeletePostRequest = {
    postId: string;
}
export const deletePost = async (ctx: Context) => {
    Metrics.increment("posts.deletePost");

    const data = <DeletePostRequest>ctx.request.body;

    if (!data) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        // Remove the post and associated comments from the graph
        const __ = DBConnector.__();

        // Step 1: Get the esId of the post
        const results = await DBConnector.getGraph()
            .V(data.postId)
            .as("post")
            .out(EDGE_POST_TO_USER)
            .as("user")
            .select("post", "user")
            .by(
                __.project("id", "esId")
                    .by(DBConnector.T().id)
                    .by("esId")
            )
            .by(DBConnector.T().id)
            .toList();

        if (results == null || results.length == 0) {
            return handleValidationError(ctx, "Error deleting post");
        }

        let esId: string | null = null;
        let userId: string | null = null;
        for (const entry of results) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map = entry as Map<string, any>;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const post = map.get("post") as Map<string, any>;
            esId = post?.get("esId");
            userId = map.get("user");
        }

        if (esId == null || userId == null) {
            return handleValidationError(ctx, "Error deleting post");
        }

        const userIdFromJWT = ctx.state.user.id;
        // Check if the logged-in user is trying to access their own data
        if (userIdFromJWT != userId) {
            // 403 - Forbidden
            return handleValidationError(ctx, "You do not have permission to access this data", 403);
        }

        // Step 2: Get all vertex IDs to delete (post + comments)
        const vertexIdsToDelete = await DBConnector.getGraph()
            .V(data.postId)
            .union(
                __.identity(),
                __.both(EDGE_POST_TO_COMMENT, EDGE_COMMENT_TO_POST)
            )
            .dedup()
            .id()
            .toList();

        if (vertexIdsToDelete.length === 0) {
            logger.warn(`No vertices found to delete for post: ${data.postId}`);
            return handleValidationError(ctx, "Error deleting post");
        }

        // Start the transaction here to instead of above to keep any locks
        // from living longer than necessary
        await DBConnector.beginTransaction();

        // Step 3: Drop all edges connected to those vertices
        await DBConnector.getGraph(true)
            .V(...vertexIdsToDelete)
            .bothE()
            .drop()
            .iterate();

        // Step 4: Drop the vertices themselves
        await DBConnector.getGraph(true)
            .V(...vertexIdsToDelete)
            .drop()
            .iterate();

        // Remove the post from ES
        const esResult = await ESConnector.getInstance().delete(esId as string);
        if (!esResult || (esResult.result !== 'deleted' && esResult.result !== 'not_found')) {
            await DBConnector.rollbackTransaction();
            return handleValidationError(ctx, "Error deleting post");
        }

        await DBConnector.commitTransaction();

        // Step 5: Remove post from Redis
        RedisConnector.del(esId as string);

        ctx.status = 200;
    } catch (err) {
        console.log(err);
        logger.error(err);
        await DBConnector.rollbackTransaction();
        return handleValidationError(ctx, "Error deleting post");
    }
}

type UpdatePostRequest = {
    postId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fields: any;
}

export const updatePost = async (ctx: Context) => {
    Metrics.increment("posts.updatePost");

    const data = <UpdatePostRequest>ctx.request.body;

    if (!data || !data.postId || !data.fields) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        const __ = DBConnector.__();

        // Step 1: Get the userId and esId of the post
        const results = await DBConnector.getGraph()
            .V(data.postId)
            .as("post")
            .out(EDGE_POST_TO_USER)
            .as("user")
            .select("post", "user")
            .by(
                __.project("id", "esId")
                    .by(DBConnector.T().id)
                    .by("esId")
            )
            .by(DBConnector.T().id)
            .toList();

        if (results == null || results.length == 0) {
            return handleValidationError(ctx, "Error updating post");
        }

        let esId: string | null = null;
        let userId: string | null = null;
        for (const entry of results) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map = entry as Map<string, any>;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const post = map.get("post") as Map<string, any>;
            esId = post?.get("esId");
            userId = map.get("user");
        }

        if (esId == null || userId == null) {
            return handleValidationError(ctx, "Error updating post");
        }

        const userIdFromJWT = ctx.state.user.id;
        // Check if the logged-in user is trying to access their own data
        if (userIdFromJWT != userId) {
            // 403 - Forbidden
            return handleValidationError(ctx, "You do not have permission to access this data", 403);
        }

        // Step 2, update the post in ES with the supplied fields

        // Build the params section passed to the script        
        const params: Record<string, unknown> = {
            commentsDisabled: data.fields.commentsDisabled != null ? data.fields.commentsDisabled : null,
            likesDisabled: data.fields.likesDisabled != null ? data.fields.likesDisabled : null,
            locationText: data.fields.locationText != null ? sanitizeInput(data.fields.locationText) : null,
            captionText: data.fields.captionText != null ? sanitizeInput(data.fields.captionText) : null,
            altText: data.fields.altText != null ? data.fields.altText.map((entry: string) => sanitizeInput(entry)) : null
        };


        const esResult = await ESConnector.getInstance().update(esId, {
            source:
                `
                // Update only the fields with non-null matching parameters
                if (params.containsKey('commentsDisabled') && params.commentsDisabled != null) {
                    ctx._source.global.commentsDisabled = params.commentsDisabled;
                }
                if (params.containsKey('likesDisabled') && params.likesDisabled != null) {
                    ctx._source.global.likesDisabled = params.likesDisabled;
                }
                if (params.containsKey('locationText') && params.locationText != null) {
                    ctx._source.global.locationText = params.locationText;
                }
                if (params.containsKey('captionText') && params.captionText != null) {
                    ctx._source.global.captionText = params.captionText;
                }
                
                // Update altText for media items using index-matched altText array
                if (ctx._source.containsKey('media') && params.altText != null) {                    
                    int mediaSize = ctx._source.media.size();
                    int altTextSize = params.altText.size();

                    // Calculate the smaller of the two lengths
                    int minSize;
                    if (mediaSize < altTextSize) {
                        minSize = mediaSize;
                    } else {
                        minSize = altTextSize;
                    }              
                    
                    // Iterate through the media array and update the altText
                    for (int i = 0; i < minSize; i++) {
                        if (params.altText[i] != null) {
                            ctx._source.media[i].altText = params.altText[i];
                        }
                    }
                }
                    
                Set tags = new HashSet();
                Set mentions = new HashSet();
                Pattern hashtagPattern = /#\\w+/;
                Pattern mentionPattern = /@\\w+/;

                if (ctx._source.containsKey('global') && ctx._source.global != null) {
                    if (ctx._source.global.containsKey('locationText') && ctx._source.global.locationText instanceof String) {
                        String text = ctx._source.global.locationText;
                        Matcher tagMatcher = hashtagPattern.matcher(text);
                        while (tagMatcher.find()) {
                            tags.add(tagMatcher.group().toLowerCase());
                        }
                        Matcher mentionMatcher = mentionPattern.matcher(text);
                        while (mentionMatcher.find()) {
                            mentions.add(mentionMatcher.group().toLowerCase());
                        }
                    }

                    if (ctx._source.global.containsKey('captionText') && ctx._source.global.captionText instanceof String) {
                        String text = ctx._source.global.captionText;
                        Matcher tagMatcher = hashtagPattern.matcher(text);
                        while (tagMatcher.find()) {
                            tags.add(tagMatcher.group().toLowerCase());
                        }
                        Matcher mentionMatcher = mentionPattern.matcher(text);
                        while (mentionMatcher.find()) {
                            mentions.add(mentionMatcher.group().toLowerCase());
                        }
                    }
                }

                if (ctx._source.containsKey("media") && ctx._source.media instanceof List) {
                    for (item in ctx._source.media) {
                        if (item.containsKey("altText") && item.altText instanceof String) {
                            String text = item.altText;
                            Matcher tagMatcher = hashtagPattern.matcher(text);
                            while (tagMatcher.find()) {
                                tags.add(tagMatcher.group().toLowerCase());
                            }
                            Matcher mentionMatcher = mentionPattern.matcher(text);
                            while (mentionMatcher.find()) {
                                mentions.add(mentionMatcher.group().toLowerCase());
                            }
                        }
                    }
                }

                ctx._source.hashtags = new ArrayList(tags);
                ctx._source.mentions = new ArrayList(mentions);   
            `,
            "params": params,
            "lang": "painless"
        }, true);

        if (esResult == null || esResult?.result != "updated") {
            return handleValidationError(ctx, "Error updating post");
        }

        // Step 3: Update the value in Redis by simply replacing the entire object
        const post = esResult.get?._source;
        if (post == null) {
            return handleValidationError(ctx, "Error updating post");
        }
        await RedisConnector.set(esResult._id, JSON.stringify(post));

        ctx.status = 200;
        ctx.body = post;
    } catch (err) {
        console.log(err);
        logger.error(err)
        return handleValidationError(ctx, "Error updating posts");
    }
}

type GetAllPostsByFollowingRequest = {
    dateTime?: string;
    postId?: string;
    userId: string;
};

type GetAllPostsByFollowingResponse = {
    posts: Post[];
    dateTime: string;
    postId: string;
    done: boolean;
};

export const getAllPostsByFollowing = async (ctx: Context) => {
    Metrics.increment("posts.getAllPostsByFollowing");

    const data = <GetAllPostsByFollowingRequest>ctx.request.body;

    try {
        if (data.userId == null) {
            return handleValidationError(ctx, "Invalid params passed");
        }

        const followingIds: string[] = await getFollowingUserIds(data.userId);

        if (followingIds.length === 0) {
            ctx.status = 200;
            ctx.body = [];
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: any = {
            query: {
                nested: {
                  path: "user",
                  query: {
                    terms: {
                      "user.userId": followingIds
                    }
                  }
                }
              },            
            sort: [
                {
                    "global.dateTime": {
                        "order": "asc",
                        "nested": {
                            "path": "global"
                        },
                        "mode": "min"
                    }
                },
                {
                    "media.postId": {
                      "order": "asc",
                      "nested": {
                        "path": "media"
                      },
                      "mode": "min"
                    }
                }             
            ]
        }

        if (data.dateTime != null && data.postId != null) {
            query.search_after = [data.dateTime, data.postId];
        }

        const response: GetAllPostsByFollowingResponse = {
            posts: [],
            dateTime: "",
            postId: "",
            done: true
        };

        const resultSize:number = config.get("es.defaultPaginationSize");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any = await ESConnector.getInstance().searchWithPagination(query, resultSize);

        if (results?.body?.hits?.hits?.length === 0) {
            ctx.status = 200;
            ctx.body = response;
            return;
        }        

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const posts: any = {};
        const postIds: string[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hits: any = results.body.hits.hits;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any            
        hits.map(async (entry: any) => {
            // Use this postId to avoid having to do a esId to postId DB query
            const postId = entry._source.media[0].postId;
            posts[postId] = entry._source;
            posts[postId].postId = postId;
            posts[postId].user.pfp = await getPfpByUserId(posts[postId].user.userId);

            postIds.push(postId);
        });

        response.dateTime = hits[hits.length - 1].sort[0];
        response.postId = hits[hits.length - 1].sort[1];
        response.done = hits.length < resultSize;      


        // Now update the posts' return values by adding all the likes and just the comment counts

        // Get all posts' likes
        const __ = DBConnector.__();
        const dbResults = await DBConnector.getGraph().V(postIds)
            .filter(__.inE(EDGE_USER_LIKED_POST).count().is(DBConnector.P().gt(0)))
            .project("postId", "users")
            .by(__.id())
            .by(__.inE(EDGE_USER_LIKED_POST)
                .outV()
                .project('profileId', 'userName', 'pfp', 'firstName', 'lastName', 'id')
                .by("profileId")
                .by("userName")
                .by("pfp")
                .by("firstName")
                .by("lastName")
                .by(__.id())
                .fold()
            ).toList();

        if (dbResults != null && dbResults.length > 0) {
            for (const result of dbResults) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const postMap: Map<any, any> = (result as Map<any, any>);
                const postId = postMap.get("postId");
                const users = postMap.get("users");

                // Make sure that the postId found in DB matches one
                // from the above ES query. They could be out of sync due to pagination
                if (posts[postId] == null) {
                    continue;
                }

                const post: Post = (posts[postId] as Post);
                if (post.global.likes == null) {
                    post.global.likes = [];
                }

                for (const user of users) {
                    const newLike: Like = {
                        userName: user.get("userName"),
                        userId: user.get("id"),
                        profileId: user.get("profileId"),
                        firstName: user.get("firstName"),
                        lastName: user.get("lastName"),
                        pfp: user.get("pfp")
                    };
                    post.global.likes.push(newLike);
                }
            }
        }

        // Add the posts to the response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.posts = Object.values(posts).map((entry: any) => entry);

        ctx.body = response;
        ctx.status = 200;

    } catch (err) {
        console.log(err);
        logger.error(err);
        return handleValidationError(ctx, "Error getting posts");
    }
}

type GetPostByIdRequest = {
    postId: string
};

export const postGetPostById = async (ctx: Context) => {
    Metrics.increment("posts.getById");

    const data = <GetPostByIdRequest>ctx.request.body;
    const postId = data.postId;

    if (postId == null || postId.trim().length === 0) {
        return handleValidationError(ctx, "Error getting post");
    }

    try {
        ctx.body = await getPostByPostId(postId);
        ctx.status = 200;
    } catch (err) {
        console.log(err);
        logger.error(err);
        return handleValidationError(ctx, "Error getting post");
    }
}

type LikeRequest = {
    postId: string;
    userId: string;
}

export const toggleLikePost = async (ctx: Context) => {
    Metrics.increment("posts.toggleLike");

    const data = <LikeRequest>ctx.request.body;

    if (data.postId == null || data.userId == null) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    let isLiked: boolean | undefined = false;

    try {
        const __ = DBConnector.__();

        await DBConnector.beginTransaction();

        // Check the graph to see if the user likes the post
        isLiked = await DBConnector.getGraph(true).V(data.userId)
            .out(EDGE_USER_LIKED_POST)
            .hasId(data.postId)
            .hasNext();

        if (isLiked) {
            // User currently likes this post which means we need to unlike
            // Drop both the edges            
            await DBConnector.getGraph(true).V(data.postId)
                .outE(EDGE_POST_LIKED_BY_USER)
                .filter(__.inV().hasId(data.userId))
                .drop()
                .next();

            await DBConnector.getGraph(true).V(data.userId)
                .outE(EDGE_USER_LIKED_POST)
                .filter(__.inV().hasId(data.postId))
                .drop()
                .next();
        } else {
            // Need to like the post by adding the edges
            const result = await DBConnector.getGraph(true).V(data.postId)
                .as("post")
                .V(data.userId)
                .as("user")
                .addE(EDGE_POST_LIKED_BY_USER)
                .from_("post")
                .to("user")
                .addE(EDGE_USER_LIKED_POST)
                .from_("user")
                .to("post")
                .next();

            if (result == null || result.value == null) {
                return handleValidationError(ctx, "Error toggling like state");
            }
        }

        await DBConnector.commitTransaction();

        ctx.body = { liked: !isLiked };
        ctx.status = 200;
    } catch (err) {
        console.log(err);
        logger.error(err);
        await DBConnector.rollbackTransaction();
        return handleValidationError(ctx, "Error toggling like state");
    }
}

export const postIsPostLikedByUserId = async (ctx: Context) => {
    Metrics.increment("posts.isPostLiked");

    const data = <LikeRequest>ctx.request.body;

    if (data.postId == null || data.userId == null) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    let isLiked: boolean | undefined = false;

    try {
        // Check the graph to see if the user likes the post
        isLiked = await DBConnector.getGraph().V(data.userId)
            .out(EDGE_USER_LIKED_POST)
            .hasId(data.postId)
            .hasNext();

        ctx.body = { liked: isLiked };
        ctx.status = 200;
    } catch (err) {
        logger.error(err);
        return handleValidationError(ctx, "Error getting like state");
    }
}

type GetAllLikesByPostRequest = {
    postId: string
}

export const getAllLikesByPost = async (ctx: Context) => {
    Metrics.increment("posts.getAllLikesByPost");

    const req = <GetAllLikesByPostRequest>ctx.request.query;
    const postId = req.postId?.trim();

    if (!postId || postId.length === 0) {
        return handleValidationError(ctx, "Error getting all likes");
    }

    try {
        ctx.body = await getLikesByPost(postId);
        ctx.status = 200;
    } catch (err) {
        console.log(err);
        logger.error(err);
        return handleValidationError(ctx, "Error getting all likes");
    }
}

type GetPostsByUserIdRequest = {
    userId: string;
    dateTime?: string;
    postId?: string;
};

type GetPostsByUserIdResponse = {
    posts: PostWithCommentCount[];
    dateTime: string;
    postId: string;
    done: boolean;
}

export const getPostsByUserId = async (ctx: Context) => {
    Metrics.increment("posts.getPostsByUserId");

    const data = <GetPostsByUserIdRequest>ctx.request.body;

    if (data.userId == null) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        // Return a paginated list of the user's posts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: any = {
            query: {
                nested: {
                    path: "media",
                    query: {
                        match: {
                            "media.userId": data.userId
                        }
                    }
                }
            },
            sort: [
                {
                    "global.dateTime": {
                        "order": "asc",
                        "nested": {
                            "path": "global"
                        }
                    }
                },
                {
                    "media.postId": {
                        "order": "asc",
                        "nested": {
                            "path": "media"
                        }
                    }
                },
            ]
        };

        if (data.dateTime != null && data.postId != null) {
            query.search_after = [data.dateTime, data.postId];
        }

        const results = await ESConnector.getInstance().searchWithPagination(query);

        const response: GetPostsByUserIdResponse = {
            posts: [],
            dateTime: "",
            postId: "",
            done: true
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const posts: any = {};
        const postIds: string[] = [];
        if (results && results.body.hits.hits.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hits: any = results.body.hits.hits;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any            
            hits.map((entry: any) => {
                // Use this postId to avoid having to do a esId to postId DB query
                const postId = entry._source.media[0].postId;
                posts[postId] = entry._source;
                posts[postId].postId = postId;

                postIds.push(postId);
            });

            response.dateTime = hits[hits.length - 1].sort[0];
            response.postId = hits[hits.length - 1].sort[1];
            response.done = false;
        }

        if (response.done) {
            // No more results to return, so return here
            ctx.status = 200;
            ctx.body = response;
            return;
        }

        // Now update the posts' return values by adding all the likes and just the comment counts

        // Get all posts' likes
        const __ = DBConnector.__();
        let dbResults = await DBConnector.getGraph().V(postIds)
            .filter(__.inE(EDGE_USER_LIKED_POST).count().is(DBConnector.P().gt(0)))
            .project("postId", "users")
            .by(__.id())
            .by(__.inE(EDGE_USER_LIKED_POST)
                .outV()
                .project('profileId', 'userName', 'pfp', 'firstName', 'lastName', 'id')
                .by("profileId")
                .by("userName")
                .by("pfp")
                .by("firstName")
                .by("lastName")
                .by(__.id())
                .fold()
            ).toList();

        // Get the post likes 
        if (dbResults != null && dbResults.length > 0) {
            // At least one of the given post ids has a like
            for (const result of dbResults) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const postMap: Map<any, any> = (result as Map<any, any>);
                const postId = postMap.get("postId");
                const users = postMap.get("users");

                // Make sure that the postId found in DB matches one
                // from the above ES query. They could be out of sync due to pagination
                if (posts[postId] == null) {
                    continue;
                }

                const post: PostWithCommentCount = (posts[postId] as PostWithCommentCount);
                if (post.global.likes == null) {
                    post.global.likes = [];
                }

                for (const user of users) {
                    const newLike: Like = {
                        userName: user.get("userName"),
                        userId: user.get("id"),
                        profileId: user.get("profileId"),
                        firstName: user.get("firstName"),
                        lastName: user.get("lastName"),
                        pfp: user.get("pfp")
                    };
                    post.global.likes.push(newLike);
                }
            }
        }

        // Get the per post comment counts
        dbResults = await DBConnector.getGraph().V(postIds)
            .project("postId", "commentCount")
            .by(__.id())
            .by(__.outE(EDGE_POST_TO_COMMENT).count())
            .toList();

        if (dbResults != null && dbResults.length > 0) {
            // At least one of the given post ids has a like
            for (const result of dbResults) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const postMap: Map<any, any> = (result as Map<any, any>);
                const postId = postMap.get("postId");
                const commentCount = postMap.get("commentCount");

                const post: PostWithCommentCount = (posts[postId] as PostWithCommentCount);
                post.commentCount = commentCount;
            }
        }

        // Add the posts to the response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.posts = Object.values(posts).map((entry: any) => entry);

        ctx.body = response;
        ctx.status = 200;
    } catch (err) {
        console.log(err);
        logger.error(err);
        return handleValidationError(ctx, "Error getting posts");
    }
}
