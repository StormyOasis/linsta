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