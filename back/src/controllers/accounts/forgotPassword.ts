import { APIGatewayProxyEvent } from 'aws-lambda';
import crypto from "crypto";
import DBConnector, { EDGE_TOKEN_TO_USER, EDGE_USER_TO_TOKEN } from '../../connectors/DBConnector';
import { obfuscateEmail, obfuscatePhone } from '../../utils/textUtils';
import { FORGOT_PASSWORD_TEMPLATE, sendEmailByTemplate, sendSMS } from '../../connectors/AWSConnector';
import config from '../../config';
import logger from "../../logger/logger";
import Metrics, { withMetrics } from "../../metrics/Metrics";
import { handleSuccess, handleValidationError } from '../../utils/utils';

type ForgotRequest = {
    user: string;
};

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "accounts.forgotpassword";
    return await withMetrics(baseMetricsKey, event, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: ForgotRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("User info is missing or invalid");
    }

    if (!data.user) {
        return handleValidationError("User info is missing or invalid");
    }

    try {
        const __ = DBConnector.__();
        const result = await (await DBConnector.getGraph()).V()
            .hasLabel("User")
            .or(
                __.has("email", data.user),
                __.has("userName", data.user),
                __.has("phone", data.user)
            )
            .project("email", "userName", "phone", "id")
            .by("email")
            .by("userName")
            .by("phone")
            .by(DBConnector.T().id)
            .next();

        const value: Map<string, string | number> = result?.value;
        if (!value || value.size === 0) {
            return handleValidationError("No matching user found");
        }
        const email = value.get('email') as string;
        const phone = value.get('phone') as string;
        const userName = value.get('userName') as string;
        const userId = value.get('id') as number;

        const sendResult = await sendForgotMessage(email, phone, userName, userId);
        if (!sendResult.success) {
            return handleValidationError(sendResult.error || "Failed to send message");
        }

        return handleSuccess(sendResult.body);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error handling forgot password");
    }
};

const sendForgotMessage = async (
    email: string,
    phone: string,
    userName: string,
    userId: number
): Promise<{ success: boolean; error?: string; body?: unknown }> => {
    logger.debug(`Sending lost password message for username: ${userName}`);

    if ((!email && !phone) || !userName) {
        return { success: false, error: "No contact info found" };
    }

    // Generate a unique token and store it in the db mapped to the user
    const token: string = crypto.randomUUID().replace(/-/g, "");

    try {
        // Upsert ForgotToken
        let res = await (await DBConnector.getGraph())
            .mergeV(new Map([["userId", `${userId}`]]))
            .option(DBConnector.Merge().onCreate, new Map([
                [DBConnector.T().label, "ForgotToken"],
                ["token", token],
                ["userId", `${userId}`]
            ]))
            .option(DBConnector.Merge().onMatch, new Map([["token", token]]))
            .next();

        if (!res || !res.value) {
            return { success: false, error: "Failed to create or update token" };
        }

        // Add edges between the User and ForgotToken vertices
        res = await (await DBConnector.getGraph()).V()
            .hasLabel("User")
            .has(DBConnector.T().id, userId)
            .as("user_id")
            .V()
            .hasLabel("ForgotToken")
            .has("userId", userId)
            .as("forgot_user_id")
            .addE(EDGE_USER_TO_TOKEN)
            .from_("user_id")
            .to("forgot_user_id")
            .addE(EDGE_TOKEN_TO_USER)
            .to("user_id")
            .from_("forgot_user_id")
            .next();

        if (!res || !res.value) {
            return { success: false, error: "Failure creating token" };
        }

        if (email && email.length > 0) {
            // Send forgot message as an email to user
            const replyToAddress: string = config.aws.ses.defaultReplyAddress;

            try {
                const emailResponse = await sendEmailByTemplate(FORGOT_PASSWORD_TEMPLATE, {
                    destination: { ToAddresses: [email] },
                    source: replyToAddress,
                    template: FORGOT_PASSWORD_TEMPLATE,
                    templateData: {
                        assetHostname: config.aws.ses.imageHostName,
                        hostname: config.frontHost,
                        emailAddress: email,
                        token: token,
                        username: userName,
                    }
                });

                if (emailResponse) {
                    return {
                        success: true,
                        body: {
                            status: "OK",
                            title: "Email Sent",
                            text: `We sent an email to ${obfuscateEmail(email)} with a link to reset your password`
                        }
                    };
                } else {
                    return { success: false, error: "Failed to send message" };
                }
            } catch (err) {
                logger.error("Error sending forgot password message", err);
                return { success: false, error: "Failed to send message" };
            }
        } else {
            // Send forgot message as an SMS to user
            const message = `A request to reset your Linstagram password was made`;
            const response = await sendSMS(phone, message);

            if (response) {
                return {
                    success: true,
                    body: {
                        status: "OK",
                        title: "SMS Sent",
                        text: `A request to reset your Linstagram password was made. Use this link to reset your password ${obfuscatePhone(phone)}`
                    }
                };
            } else {
                return { success: false, error: "Failed to send message" };
            }
        }
    } catch (err) {
        logger.error("Error handling forgot message:", err);
        return { success: false, error: "Error handling forgot message" };
    }
};