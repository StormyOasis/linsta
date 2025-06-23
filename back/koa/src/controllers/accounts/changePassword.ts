import { DBConnector, EDGE_TOKEN_TO_USER, EDGE_USER_TO_TOKEN, isValidPassword, logger, metrics, withMetrics } from '@linsta/shared';
import bcrypt from 'bcrypt';
import { Context } from 'koa';
import { handleSuccess, handleValidationError } from '../../utils';

type ChangePasswordRequest = {
    token?: string;
    userName?: string;
    oldPassword?: string;
    password1: string;
    password2: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "accounts.changepassword";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const data = <ChangePasswordRequest>ctx.request.body;

    if (!data || data.password1 !== data.password2 || !isValidPassword(data.password1)) {
        return handleValidationError(ctx, 'Invalid password input or mismatch');
    }

    const hashedPassword = await bcrypt.hash(data.password1, 10);

    try {
        if (data.userName) {
            return await handleChangeByUsernamePassword(ctx, data, hashedPassword);
        } else if (data.token) {
            return await handleChangeByToken(ctx, data.token.trim(), hashedPassword);
        } else {
            return handleValidationError(ctx, 'Missing credentials');
        }
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        await DBConnector.rollbackTransaction(); // Safe to call regardless of state
        return handleValidationError(ctx, "Error changing password");
    }
}

const handleChangeByUsernamePassword = async (ctx: Context, data: ChangePasswordRequest, hashedPassword: string) => {
    if (!data.oldPassword) {
        return handleValidationError(ctx, 'Old password required');
    }

    const graph = await DBConnector.getGraph()

    // Use the username and password to change password
    const userRes = await graph
        .V()
        .hasLabel('User')
        .has('userName', data.userName)
        .project('id', 'userName', 'password')
        .by(DBConnector.T().id)
        .by('userName')
        .by('password')
        .next();

    const userData = userRes?.value;
    if (!userData) {
        return handleValidationError(ctx, 'Invalid username or password');
    }
    // Compare passwords
    const passwordMatch = await bcrypt.compare(data.oldPassword, userData.get('password') as string);
    if (!passwordMatch) {
        return handleValidationError(ctx, 'Invalid username or password');
    }
    // Update the password in the User vertex
    const updateRes = await graph
        .V(userData.get('id'))
        .property('password', hashedPassword)
        .next();

    if (!updateRes?.value) {
        return handleValidationError(ctx, 'Error updating password');
    }

    return handleSuccess(ctx, { status: 'OK' });
};

// use the token to change password and then delete the token from the db
const handleChangeByToken = async (ctx: Context, token: string, hashedPassword: string) => {
    if (!token || token.length === 0) {
        return handleValidationError(ctx, 'Invalid or missing token');
    }

    await DBConnector.beginTransaction();
    const graph = await DBConnector.getGraph(true)

    // Get the token from the db if it exists
    const tokenRes = await graph
        .V()
        .hasLabel('ForgotToken')
        .has('token', token)
        .out(EDGE_TOKEN_TO_USER)
        .next();

    const user = tokenRes?.value;
    if (!user?.id) {
        await DBConnector.rollbackTransaction();
        return handleValidationError(ctx, 'Invalid token');
    }

    // Update the password in the User vertex
    const pwUpdate = await graph
        .V(user.id)
        .property('password', hashedPassword)
        .next();

    if (!pwUpdate?.value) {
        await DBConnector.rollbackTransaction();
        return handleValidationError(ctx, 'Failed to update password');
    }

    const tokenDeletion = await graph
        .V(user.id)
        .out(EDGE_USER_TO_TOKEN)
        .drop()
        .toList();

    // Now delete the forgot token vertex
    if (!tokenDeletion) {
        await DBConnector.rollbackTransaction();
        return handleValidationError(ctx, 'Failed to clean up token');
    }

    // Done! commit
    await DBConnector.commitTransaction();
    return handleSuccess(ctx, { status: 'OK' });
};