import { APIGatewayProxyEvent } from 'aws-lambda';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import DBConnector from '../../connectors/DBConnector';
import config from '../../config';
import logger from '../../logger/logger';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import { handleSuccess, handleValidationError } from '../../utils/utils';

type LoginRequest = {
    userName: string;
    password: string;
};

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "accounts.userlogin";
    return await withMetrics(baseMetricsKey, event, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: LoginRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid input");
    }

    const { userName, password }: LoginRequest = data;

    if (!userName || !password) {
        return handleValidationError("Invalid username or password");
    }


    try {
        // Find user by email or phone
        // Check against the db for username existence
        const userResult = await (await DBConnector.getGraph()).V()
            .hasLabel("User")
            .has("userName", userName)
            .project('id', 'userName', 'password')
            .by(DBConnector.T().id)
            .by('userName')
            .by('password')
            .next();

        if (!userResult || !userResult.value) {
            return handleValidationError("Invalid username or password");
        }

        const dbData = {
            password: userResult.value.get('password') as string,
            userName: userResult.value.get('userName') as string,
            id: userResult.value.get('id') as number
        }

        const passwordMatch: boolean = await bcrypt.compare(password, dbData.password);
        if (!passwordMatch) {
            return handleValidationError("Invalid username or password");
        }

        // create the JWT token
        const token = jwt.sign(
            { id: dbData.id },
            config.auth.jwt.secret as string,
            {
                algorithm: 'HS256',
                allowInsecureKeySizes: true,
                expiresIn: config.auth.jwt.expiration
            } as SignOptions
        );

        return handleSuccess({ token, userName, id: dbData.id });
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error("Login error", err);
        return handleValidationError("Error logging in", 500);
    }

};
