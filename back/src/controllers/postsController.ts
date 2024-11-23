import { Context } from "koa";
import formidable from 'formidable';
import Metrics from "../metrics/Metrics";
import logger from "../logger/logger";
import { getFileExtByMimeType, sanitize } from "../utils/utils";
import { uploadFile } from "../Connectors/AWSConnector";
import { buildDataSetForES, buildSearchResultSet, insert, search, update } from '../Connectors/ESConnector';
import { User, Global, Entry, Post } from "../utils/types";
import RedisConnector from "../Connectors/RedisConnector";

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
    global.captionText = sanitize(global.captionText);
    global.locationText = sanitize(global.locationText);
    global.likes = [];

    try {
        // Upload each file to s3
        for(const entry of entries) {
            const file:formidable.File = (files[entry.id] as formidable.File);            

            const result = await uploadFile(file, entry.id, user.userId, getFileExtByMimeType(file.mimetype));
            entry.entityTag = result.tag.replace('"', '').replace('"', '');
            entry.url = result.url;
            entry.mimeType = file.mimetype;
            entry.alt = sanitize(entry.alt);
        }

        // Now add the data to ES
        const dataSet = buildDataSetForES(user, global, entries);

        const result = await insert(dataSet);        
        if(result.result !== 'created') {
            throw new Error("Error adding post");
        }

        // Now add the post data to redis
        await RedisConnector.set(result._id, JSON.stringify(dataSet));

    } catch(err) {
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

        const entries = buildSearchResultSet(results.body.hits.hits);

        // Update redis with results
        entries.forEach((entry) => {
            RedisConnector.set(entry.global.id, JSON.stringify(entry));
        });

        ctx.status = 200;
        ctx.body = entries;
    } catch(err) {
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
        // Attempt to get it from redis first
        const data = await RedisConnector.get(postId);
        let entries:Post[] = [];
        if(data) {
            entries[0] = JSON.parse(data);
        } else {
            // Pull from ES

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const results:any = await search({
                bool: {
                    must: [{
                        match: {_id: postId}                    
                    }]
                }
            }, 1);

            entries = buildSearchResultSet(results.body.hits.hits);
            if(entries.length > 0) {
                // Add to Redis
                await RedisConnector.set(postId, JSON.stringify(entries[0]));
            }
        }

        ctx.status = 200;
        ctx.body = entries;
    } catch(err) {
        logger.error(err);
        ctx.status = 400;
    }    
}

type LikeRequest = {
    postId: string;
    userName: string;
    userId: string;
}

export const toggleLikePost = async (ctx: Context) => {
    Metrics.increment("posts.toggleLike");

    const data = <LikeRequest>ctx.request.body;

    if (data.userName == null || data.postId == null || data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    let isLiked:boolean = false;

    try {
        // Check if user currently likes this post or not
        const results = await search(
            {
                bool: {
                  must: [
                    {
                      match: { _id: data.postId }
                    },
                    {
                      nested: {
                        path: "post.global",
                        query: {
                          nested: {
                            path: "post.global.likes",
                            query: {
                              bool: {
                                must: [
                                  {match: { "post.global.likes.userName": data.userName}}
                                ]
                              }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
            }, 1);   
            
        isLiked = (results.body.hits.hits.length === 1);

        // Toggle the like in ES
        await update(data.postId, {
            source: "if(ctx._source.post.global.likes.contains(params.newLikes)) {ctx._source.post.global.likes.remove(ctx._source.post.global.likes.indexOf(params.newLikes));} else {ctx._source.post.global.likes.add(params.newLikes)}",
            lang: "painless",
            params: {
                newLikes: {userName: data.userName, userId: data.userId}
            }
        });

        ctx.body = {liked: !isLiked};
        ctx.status = 200;
    } catch(err) {
        ctx.status = 400;
        return;
    }
}