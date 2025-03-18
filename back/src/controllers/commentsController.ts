import { Context } from "koa";
import Metrics from "../metrics/Metrics";
import { getPostByPostId, getVertexPropertySafe, sanitize } from "../utils/utils";
import { Comment, Like, Post, User } from "../utils/types";
import logger from "../logger/logger";
import { update } from "../Connectors/ESConnector";
import DBConnector, { EDGE_CHILD_TO_PARENT_COMMENT, EDGE_COMMENT_LIKED_BY_USER, EDGE_COMMENT_TO_POST, EDGE_COMMENT_TO_USER, EDGE_PARENT_TO_CHILD_COMMENT, EDGE_POST_TO_COMMENT, EDGE_USER_LIKED_COMMENT, EDGE_USER_TO_COMMENT } from "../Connectors/DBConnector";

type AddCommentRequest = {
    text: string;
    postId: string;
    userName: string;
    userId: string;
    parentCommentId: string|null;
};

export const addComment = async (ctx: Context) => {
    Metrics.increment("comments.addComment");

    const data = <AddCommentRequest>ctx.request.body;

    if (data.text == null || data.postId == null || data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    try {
        // First grab the post data from redis / DB so we can check the comments disabled flag
        const postById = await getPostByPostId(data.postId);        
        if(postById === null) {
            throw new Error("Error getting post");
        }

        const post: Post = postById.post;

        // Make sure that commenting is enabled for this post
        if(post.global.commentsDisabled) {
            ctx.status = 200;
            ctx.body = { status: "Comments disabled for this post" };    
            return;
        }

        // Add the comment data to the db only(Comments won't be searchable)
        DBConnector.beginTransaction();

        let result = await DBConnector.getGraph(true)?.addV("Comment")
            .property("dateTime", new Date())            
            .property("text", sanitize(data.text))
            .next();

        if(result == null || result?.value == null) {
            throw new Error("Error adding comment");
        }           

        const id = result.value.id;

        // Add the edge to the graph. We need:
        // 1. Edges between user and comment
        // 2. Edges between comment and post
        // 3. Edges between comment and another parent comment
        
        // Edges between User and comment
        result = await DBConnector.getGraph(true)?.V(id)
            .as("comment")
            .V(data.userId)
            .as("user")
            .addE(EDGE_COMMENT_TO_USER)
            .from_("comment")
            .to("user")
            .addE(EDGE_USER_TO_COMMENT)
            .from_("user")
            .to("comment")
            .next();

        if(result == null || result.value == null) {
            throw new Error("Error adding comment");
        }          

        // Edges between comment and post
        result = await DBConnector.getGraph(true)?.V(id)
            .as("comment")
            .V(data.postId)
            .as("post")
            .addE(EDGE_COMMENT_TO_POST)
            .from_("comment")
            .to("post")
            .addE(EDGE_POST_TO_COMMENT)
            .from_("post")
            .to("comment")
            .next();

        if(result == null || result.value == null) {
            throw new Error("Error adding comment");
        }          

        // Edges between comment and another parent comment (if applicable)
        if(data.parentCommentId != null) {
            result = await DBConnector.getGraph(true)?.V(id)
                .as("comment")
                .V(data.parentCommentId)
                .as("parent")
                .addE(EDGE_CHILD_TO_PARENT_COMMENT)
                .from_("comment")
                .to("parent")
                .addE(EDGE_PARENT_TO_CHILD_COMMENT)
                .from_("parent")
                .to("comment")
                .next();            

            if(result == null || result.value == null) {
                throw new Error("Error adding comment");
            }                          
        }

        // Update the comment count field in the post in ES
        ///await update(esId, {
        //    source: "ctx._source.post.global.commentCount++",
        //    lang: "painless"
        //});

        await DBConnector.commitTransaction();

        ctx.status = 200;
        ctx.body = {id};
    } catch(err) {        
        console.log(err);
        logger.error(err);
        ctx.status = 400;
        await DBConnector.rollbackTransaction();     
    }
}

type GetCommentsByPostIdRequest = {
    postId: string;
};

export const getCommentsByPostId = async (ctx: Context) => {
    Metrics.increment("comments.getCommentsByPostId");

    const data = <GetCommentsByPostIdRequest>ctx.request.body;

    if (data.postId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    try {
        const __ = DBConnector.__();

        const results = await DBConnector.getGraph()?.V(data.postId)
            .as("post")
            .out(EDGE_POST_TO_COMMENT)
            .as("comment")
            .union(
                __.local(
                    __.union(
                        __.local(__.union(__.identity().project("comment").by(), __.out(EDGE_COMMENT_TO_USER).project("user").by())),
                        __.outE(EDGE_COMMENT_TO_USER).project(EDGE_COMMENT_TO_USER).by())), 
                __.outE(EDGE_CHILD_TO_PARENT_COMMENT)
                .project(EDGE_CHILD_TO_PARENT_COMMENT).by())
            .dedup()
            .toList();
     
        if(results == null) {
            throw new Error("Error getting comment");
        }      
        
        const commentMap: Map<string, Comment> = new Map<string, Comment>();
        const userMap: Map<string, User> = new Map<string, User>();
        const userFromCommentMap: Map<string, string> = new Map<string, string>();
        const childToParentMap: Map<string, string> = new Map<string, string>();

        // Store the results of the query so we can build out the comments list
        for(const result of results) {            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map:Map<any, any> = (result as Map<any, any>);
            if(map.has("comment")) {
                // Entry is a comment vertex, add to Comment array
                const vertex = map.get("comment");
                const vertexProperties = vertex['properties'];
                const newComment:Comment = {
                    commentId: "",
                    dateTime: "",
                    text: "",
                    user: {
                        userName: "",
                        userId: "",
                        pfp: ""
                    },
                    postId: data.postId,
                    parentCommentId: null,
                    likes: []
                };
                
                newComment.commentId = vertex['id'];
                newComment.dateTime = getVertexPropertySafe(vertexProperties, 'dateTime');
                newComment.text = getVertexPropertySafe(vertexProperties, 'text');

                commentMap.set(newComment.commentId, newComment);
            } else if(map.has("user")) {
                const vertex = map.get("user");
                const vertexProperties = vertex['properties'];
                const newUser:User = {
                    userName: "",
                    userId: "",
                    pfp: ""
                };
                
                newUser.userId = vertex['id'];
                newUser.userName = getVertexPropertySafe(vertexProperties, 'userName');
                newUser.pfp = getVertexPropertySafe(vertexProperties, 'pfp');

                userMap.set(newUser.userId, newUser);
            } else if(map.has(EDGE_COMMENT_TO_USER)) {           
                const edge = map.get(EDGE_COMMENT_TO_USER);
                
                userFromCommentMap.set(edge.outV.id, edge.inV.id);
            } else if(map.has(EDGE_CHILD_TO_PARENT_COMMENT)) { 
                const edge = map.get(EDGE_CHILD_TO_PARENT_COMMENT);
                
                childToParentMap.set(edge.outV.id, edge.inV.id);
            }                           
        }

        // Merge the 4 maps into one comment list object
        const comments:Comment[] = [];

        for(const tmpComment of commentMap.entries()) {            
            // Get the user data for the comment
            const commentId = tmpComment[0];
            const userId = userFromCommentMap.get(commentId);
            if(userId == null) {
                throw new Error("Invalid comment data");
            }
            const user:User = userMap.get(userId) as User;

            // Get the parent mapping for the comment
            let parentId:string|null|undefined = childToParentMap.get(commentId);
            if(parentId === undefined) {
                parentId = null;
            }
            const newComment: Comment = {
                commentId,
                dateTime: tmpComment[1].dateTime,
                text: tmpComment[1].text,
                user: {
                    userName: user.userName,
                    userId: user.userId,
                    pfp: user.pfp
                },
                postId: data.postId,
                parentCommentId: parentId,
                likes: await (async ():Promise<Like[]> => {
                    // Get the likes for this comment from the db
                    const results = await DBConnector.getGraph()?.V(commentId)
                        .out(EDGE_COMMENT_LIKED_BY_USER)
                        .project("user")
                        .by()
                        .toList();
                    
                    if(results == null) {
                        return [];
                    }                            

                    const likes: Like[] = [];
                    for(const result of results) {            
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const map:Map<any, any> = (result as Map<any, any>);
                        const vertex = map.get("user");
                        const vertexProperties = vertex['properties'];   
                        
                        const like: Like = {
                            userId: vertex.id,
                            userName: getVertexPropertySafe(vertexProperties, 'userName'),
                            pfp: getVertexPropertySafe(vertexProperties, 'pfp'),
                            firstName: getVertexPropertySafe(vertexProperties, 'firstName'),
                            lastName: getVertexPropertySafe(vertexProperties, 'lastName'),
                            profileId: getVertexPropertySafe(vertexProperties, 'profileId'),
                        };

                        likes.push(like);
                    }                    
                    return likes; // return an array of likes              
                })()
            };
            
            comments.push(newComment);
        }

        ctx.body = comments;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error(err);
        ctx.status = 400;
        return;        
    }
}

type LikeRequest = {
    commentId: string;
    userId: string;
}

export const toggleCommentLike = async (ctx: Context) => {
    Metrics.increment("comments.toggleCommentLike");

    const data = <LikeRequest>ctx.request.body;

    if (data.commentId == null || data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    let isLiked:boolean = false;

    try {
        const __ = DBConnector.__();        

        // Check if user currently likes this comment
        const isLikedResults = await DBConnector.getGraph()?.V(data.commentId)
            .as("comment")
            .outE(EDGE_COMMENT_LIKED_BY_USER)
            .filter(__.inV().hasId(data.userId))
            .toList();

        if(isLikedResults == null) {
            throw new Error("Error getting comment");
        }

        isLiked = isLikedResults.length > 0;

        // Update the graph adding or removing edges as necessary
        if(isLiked) {
            // drop the edges
            let results = await DBConnector.getGraph()?.V(data.commentId)
                .as("comment")
                .outE(EDGE_COMMENT_LIKED_BY_USER)
                .filter(__.inV().hasId(data.userId))
                .drop()
                .toList();

            if(results == null) {
                throw new Error("Error unliking comment");
            }

            results = await DBConnector.getGraph()?.V(data.userId)
                .as("user")
                .outE(EDGE_USER_LIKED_COMMENT)
                .filter(__.inV().hasId(data.commentId))
                .drop()
                .toList();

            if(results == null) {
                throw new Error("Error unliking comment");
            }
        } else {
            // add the edges
            const results = await DBConnector.getGraph()?.V(data.commentId)
                .as("comment")
                .V(data.userId)
                .as("user")
                .addE(EDGE_COMMENT_LIKED_BY_USER)
                .from_("comment")
                .to("user")
                .addE(EDGE_USER_LIKED_COMMENT)
                .from_("user")
                .to("comment")
                .toList()

            if(results == null) {
                throw new Error("Error liking comment");
            }            
        }

        ctx.body = {liked: !isLiked};
        ctx.status = 200;
    } catch(err) {        
        console.log(err);
        ctx.status = 400;
        return;
    }    
}