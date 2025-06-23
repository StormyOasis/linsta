import { config, DBConnector, logger, metrics, withMetrics } from '@linsta/shared';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Context } from 'koa';
import { handleValidationError, handleSuccess } from '../../utils';

type LoginRequest = {
    userName: string;
    password: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "accounts.userlogin";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { userName, password }: LoginRequest = <LoginRequest>ctx.request?.body;

    if (!userName || !password) {
        return handleValidationError(ctx, "Invalid username or password");
    }

    try {
        const graph = await DBConnector.getGraph();
        // Find user by email or phone
        // Check against the db for username existence
        const userResult = await graph.V()
            .hasLabel("User")
            .has("userName", userName)
            .project('id', 'userName', 'password')
            .by(DBConnector.T().id)
            .by('userName')
            .by('password')
            .next();

        if (!userResult || !userResult.value) {
            return handleValidationError(ctx, "Invalid username or password");
        }

        const dbData = {
            password: userResult.value.get('password') as string,
            userName: userResult.value.get('userName') as string,
            id: userResult.value.get('id') as number
        }

        const passwordMatch: boolean = await bcrypt.compare(password, dbData.password);
        if (!passwordMatch) {
            return handleValidationError(ctx, "Invalid username or password");
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

        return handleSuccess(ctx, { token, userName, id: dbData.id });
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error("Login error", err);
        return handleValidationError(ctx, "Error logging in", 500);
    }
};
