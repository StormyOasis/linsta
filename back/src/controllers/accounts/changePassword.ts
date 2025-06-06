import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import bcrypt from 'bcrypt';
import DBConnector, { EDGE_TOKEN_TO_USER, EDGE_USER_TO_TOKEN } from '../../connectors/DBConnector';
import { isValidPassword } from '../../utils/textUtils';
import logger from '../../logger/logger';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import { handleSuccess, handleValidationError } from '../../utils/utils';

type ChangePasswordType = {
    token?: string;
    userName?: string;
    oldPassword?: string;
    password1: string;
    password2: string;
};

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "accounts.changepassword";
    return await withMetrics(baseMetricsKey, event.headers,async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: ChangePasswordType;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid parameters or missing token");
    }

    if (!data || (data.token == null && (data.userName == null || data.oldPassword == null))) {
        return handleValidationError("Invalid parameters or missing token");
    }

    if (data.password1 !== data.password2) {
        return handleValidationError("Passwords don't match");
    }

    if (!isValidPassword(data.password1)) {
        return handleValidationError("Invalid password format");
    }

    const hashedPassword = await bcrypt.hash(data.password1, 10);

    try {
        if (data.userName != null) {
            if (data.oldPassword == null) {
                return handleValidationError("Invalid parameters or missing token");
            }

            let result = await (await DBConnector.getGraph()).V()
                .hasLabel("User")
                .has("userName", data.userName)
                .project('id', 'userName', 'password')
                .by(DBConnector.T().id)
                .by('userName')
                .by('password')
                .next();

            const value: Map<string, string | number> = result?.value;
            if (value == null || value.size === 0) {
                return handleValidationError("Invalid username or password");
            }

            type db_result = {
                password: string;
                id: number,
                userName: string;
            };

            const dbData: db_result = {
                password: value.get('password') as string,
                userName: value.get('userName') as string,
                id: value.get('id') as number
            };

            const passwordMatch: boolean = await bcrypt.compare(data.oldPassword, dbData.password);

            if (!passwordMatch) {
                return handleValidationError("Invalid username or password");
            }

            // Use the username and password to change password
            result = await (await DBConnector.getGraph()).V()
                .hasLabel("User")
                .has('userName', data.userName)
                .property('password', hashedPassword)
                .next();

            if (result?.value == null) {
                return handleValidationError("Invalid username or password");
            }
        } else {
            // use the token to change password and then delete the token from the db
            const token: string | undefined = data.token?.trim();
            if (!token || token.length === 0) {
                return handleValidationError("Invalid token");
            }

            await DBConnector.beginTransaction();

            // Get the token from the db if it exists
            let result = await (await DBConnector.getGraph(true)).V()
                .hasLabel("ForgotToken")
                .has('token', token)
                .out(EDGE_TOKEN_TO_USER)
                .next();

            let value = result?.value;
            if (value == null || value.id == null) {
                await DBConnector.rollbackTransaction();
                return handleValidationError("Invalid token");
            }

            // Update the password in the User vertex
            result = await (await DBConnector.getGraph(true)).V(value.id)
                .property('password', hashedPassword)
                .next();

            value = result?.value;
            if (value == null || value.id == null) {
                await DBConnector.rollbackTransaction();
                return handleValidationError("Error changing password");
            }

            // Now delete the forgot token vertex
            const dropResult = await (await DBConnector.getGraph(true))
                .V(value.id)
                .out(EDGE_USER_TO_TOKEN)
                .drop()
                .toList();

            if (!dropResult) {
                await DBConnector.rollbackTransaction();
                return handleValidationError("Error changing password");
            }

            await DBConnector.commitTransaction();
        }
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        await DBConnector.rollbackTransaction();
        return handleValidationError("Error with token");
    }

    return handleSuccess({ status: "OK" });
}