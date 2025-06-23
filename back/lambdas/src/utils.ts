import { APIGatewayProxyEvent } from "aws-lambda";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { config, logger, RedisConnector } from "@linsta/shared";
import type { Profile } from "@linsta/shared";

export const getIpFromEvent = (event: APIGatewayProxyEvent): string => {
    let ip = event.requestContext.identity.sourceIp;
    if (!ip) {
        ip = !ip && event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    }

    return ip;
}

export const verifyJWT = (event: APIGatewayProxyEvent, userId: string): JwtPayload | string | null => {
    if (!event || !userId) {
        return null;
    }

    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
        return null;
    }
    const token = authHeader.replace(/^Bearer /, '');
    try {
        const jwtPayload: JwtPayload | string = jwt.verify(token, config.auth.jwt.secret);
        if (!jwtPayload || (typeof jwtPayload === "object" && jwtPayload.id != userId)) {
            return null
        }
        return jwtPayload;
    } catch(err) {
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