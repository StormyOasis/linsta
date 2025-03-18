import { Context } from "koa";
import formidable from 'formidable';
import Metrics from "../metrics/Metrics";
import logger from "../logger/logger";
import { getFileExtByMimeType, getLikesByPost, getPfpByUserId, getPostByPostId, getPostIdFromEsId, sanitize } from "../utils/utils";
import { uploadFile } from "../Connectors/AWSConnector";
import { buildDataSetForES, buildSearchResultSet, insert, search, update } from '../Connectors/ESConnector';
import { User, Global, Entry } from "../utils/types";
import RedisConnector from "../Connectors/RedisConnector";
import DBConnector, { EDGE_POST_LIKED_BY_USER, EDGE_POST_TO_USER, EDGE_USER_LIKED_POST, EDGE_USER_TO_POST } from "../Connectors/DBConnector";

export const addPost = async (ctx: Context) => {
    Metrics.increment("posts.addPost");

    const data = ctx.request.body;
    const files = ctx.request.files;

    if (!data || !files) {
        ctx.status = 400;
        return;
    }

    const user:User = JSON.parse(data.user);
    const global:Global = JSON.parse(data.global);
    const entries:Entry[] = JSON.parse(data.entries);

    // strip out any potentially problematic html tags
    user.userId = sanitize(user.userId);
    global.captionText = sanitize(global.captionText);
    global.locationText = sanitize(global.locationText);

    try {
        // Upload each file to s3
        for(const entry of entries) {
            const file:formidable.File = (files[entry.id] as formidable.File);            

            const result = await uploadFile(file, entry.id, user.userId, getFileExtByMimeType(file.mimetype));
            entry.entityTag = result.tag.replace('"', '').replace('"', '');
            entry.url = result.url;
            entry.mimeType = file.mimetype;
            entry.alt = sanitize(entry.alt);
            entry.userId = user.userId;
        }

        // Now add the data to ES
        const dataSet = buildDataSetForES(user, global, entries);

        const esResult = await insert(dataSet);        
        if(esResult.result !== 'created') {
            throw new Error("Error adding post");
        }

        // Now add an associated vertex and edges to the graph for this post
        DBConnector.beginTransaction();
        
        // Now add a post vertex to the graph
        let graphResult = await DBConnector.getGraph(true)?.addV("Post")
            .property("esId", esResult._id)
            .next();  

        if(graphResult == null || graphResult.value == null) {
            throw new Error("Error creating post");
        }

        const postId: string = graphResult.value.id;

        // Now add the edges between the post and user verticies            
        graphResult = await DBConnector.getGraph(true)?.V(graphResult.value.id)
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

        if(graphResult == null || graphResult.value == null) {
            throw new Error("Error creating profile links");
        }       
        
        await DBConnector.commitTransaction();

        // Update the media entries with the postId for easier
        // and faster lookup. First update in ES
        await update(esResult._id, {
            source:
                `for (int i = 0; i < ctx._source.post.media.size(); i++) {
                    ctx._source.post.media[i].postId = params.postId;
                }
            `,
            "params": {
                "postId": `${postId}`
            },
            "lang": "painless"
        });

        // Now update the data set that is put into redis adding the postId

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dataSet as any).post.media = entries.map((entry:Entry) => {
            const newData = {...entry};
            newData.postId = postId;
            return newData;
        });

        // Finally add the post data to redis
        await RedisConnector.set(esResult._id, JSON.stringify(dataSet));

    } catch(err) {
        await DBConnector.rollbackTransaction();
        logger.error(err);
        ctx.status = 400;
        return;
    }
    
    ctx.status = 200;
}

export const getAllPosts = async (ctx: Context) => {
    Metrics.increment("posts.getAll");

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results:any = await search({
            match_all: {}            
        }, null);

        const entries = await buildSearchResultSet(results.body.hits.hits);

        // Add the like data and update redis with results
        for(const entry of entries) {
            const postId = await getPostIdFromEsId(entry.global.id);               
            if(postId != null) {                
                entry.postId = postId;
                entry.global.likes = await getLikesByPost(postId);
                entry.user.pfp = await getPfpByUserId(entry.user.userId);
            }            

            await RedisConnector.set(entry.global.id, JSON.stringify(entry));
        }

        ctx.status = 200;
        ctx.body = entries;
    } catch(err) {
        console.log(err);
        logger.error(err);
        ctx.status = 400;
        ctx.body = err;
    }
}

type GetPostByIdRequest = {
    postId: string
};

export const getPostById = async(ctx: Context) => {
    Metrics.increment("posts.getById");

    const query = <GetPostByIdRequest>ctx.request.query;
    const postId = query.postId;

    if(postId == null || postId.trim().length === 0) {
        ctx.status = 400;
        return;
    }

    try { 
        ctx.status = 200;
        ctx.body = await getPostByPostId(postId);
    } catch(err) {
        console.log(err);
        logger.error(err);
        ctx.status = 400;
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
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    let isLiked:boolean|undefined = false;

    try {
        const __ = DBConnector.__();

        DBConnector.beginTransaction();

        // Check the graph to see if the user likes the post
        isLiked = await DBConnector.getGraph(true)?.V(data.userId)
            .out(EDGE_USER_LIKED_POST)
            .hasId(data.postId)
            .hasNext();

        if(isLiked) {
            // User currently likes this post which means we need to unlike
            // Drop both the edges            
            await DBConnector.getGraph(true)?.V(data.postId)
                .outE(EDGE_POST_LIKED_BY_USER)
                .filter(__.inV().hasId(data.userId))
                .drop()
                .next();

            await DBConnector.getGraph(true)?.V(data.userId)
                .outE(EDGE_USER_LIKED_POST)
                .filter(__.inV().hasId(data.postId))
                .drop()
                .next();           
        } else {
            // Need to like the post by adding the edges
            const result = await DBConnector.getGraph(true)?.V(data.postId)
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

            if(result == null || result.value == null) {
                throw new Error("Error toggling like state");
            }                   
        }

        await DBConnector.commitTransaction();        

        ctx.body = {liked: !isLiked};
        ctx.status = 200;
    } catch(err) {        
        logger.error(err);
        await DBConnector.rollbackTransaction();
        ctx.status = 400;
    }
}

export const postIsPostLikedByUserId = async (ctx: Context) => {
    Metrics.increment("posts.isPostLiked");

    const data = <LikeRequest>ctx.request.body;

    if (data.postId == null || data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    let isLiked:boolean|undefined = false;

    try {                
        // Check the graph to see if the user likes the post
        isLiked = await DBConnector.getGraph()?.V(data.userId)
            .out(EDGE_USER_LIKED_POST)
            .hasId(data.postId)
            .hasNext();    

        ctx.body = {liked: isLiked};
        ctx.status = 200;
    } catch(err) {        
        logger.error(err);
        ctx.status = 400;
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
        ctx.status = 400;
        return;
    }

    try {     
        ctx.body = await getLikesByPost(postId);
        ctx.status = 200;
    } catch(err) {        
        console.log(err);
        logger.error(err);
        ctx.status = 400;
    }
}
