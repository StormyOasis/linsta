import jwt from "jsonwebtoken";
import { Context } from "koa";

import {
  config,
  DBConnector,
  EDGE_POST_TO_COMMENT,
  EDGE_USER_FOLLOWS,
  EDGE_USER_LIKED_POST,
  getPfpByUserId,
  logger,
  type Like,
  type Post,
  handleSuccess as sharedHandleSuccess,
  handleValidationError as sharedHandleValidationError
} from "@linsta/shared";

export const isUserAuthorized = (ctx: Context, userId: string): boolean => {
    return ctx.state.user?.id === userId;
}

export const handleSuccess = (ctx: Context, result: unknown) => {
    const data = sharedHandleSuccess(result);

    ctx.status = data.statusCode;
    ctx.body = data.body;
    ctx.set(data.headers);
}

export const handleValidationError = (ctx: Context, error: string, statusCode: number = 400) => {
    const data = sharedHandleValidationError(error, statusCode);

    ctx.status = data.statusCode;
    ctx.body = data.body;
    ctx.set(data.headers);
}

export type JWTData = {
    id: string;
}

export const verifyJWT = async (ctx: Context, next: () => unknown) => {
    const authHeader: string | undefined = ctx.request.headers['authorization'];
    let token: string | undefined = undefined;
    if (authHeader) {
        const bearer = authHeader.split(' ');
        token = bearer[1];
    }

    if (!token) {
        ctx.res.statusCode = 403;
        ctx.body = { status: "Invalid token" };
        return;
    }

    let result = null;
    await jwt.verify(
        token as string,
        config.auth.jwt.secret,
        (err, decoded) => {
            const data = decoded as JWTData;
            if (err || decoded == null) {
                ctx.res.statusCode = 403;
                ctx.body = { status: "Invalid token" };
                return;
            }
            result = data.id;
        })

    if (result == null) {
        ctx.res.statusCode = 403;
        ctx.body = { status: "Error verifying id" };
        return;
    }

    ctx.res.statusCode = 200;
    ctx.body = { status: "OK" };

    await next();
}

export const addPfpsToPosts = async (posts: Record<string, Post>) => {
    await Promise.all(Object.values(posts).map(async post => {
        post.user.pfp = await getPfpByUserId(false, post.user.userId);
    }));
}

export const addCommentCountsToPosts = async (posts: Record<string, Post>, postIds: string[]) => {
    const __ = DBConnector.__();
    const commentResults = await (await DBConnector.getGraph()).V(postIds)
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
            posts[parsed.postId].global.commentCount = parsed.commentCount;
        }
    }
};

export const addLikesToPosts = async (posts: Record<string, Post>, postIds: string[]) => {
    const __ = DBConnector.__();
    const likeResults = await (await DBConnector.getGraph()).V(postIds)
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

export const getFollowingUserIds = async (userId: string): Promise<string[]> => {
    try {
        const results = await (await DBConnector.getGraph())
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