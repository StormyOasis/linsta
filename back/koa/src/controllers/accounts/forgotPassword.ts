import { 
    config, 
    DBConnector, 
    EDGE_TOKEN_TO_USER, 
    EDGE_USER_TO_TOKEN, 
    FORGOT_PASSWORD_TEMPLATE, 
    logger, 
    metrics, 
    obfuscateEmail, 
    obfuscatePhone, 
    sendEmailByTemplate, 
    sendSMS, 
    withMetrics } from "@linsta/shared";
import crypto from "crypto";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";

type ForgotRequest = {
    user: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "accounts.forgotpassword";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const data = <ForgotRequest>ctx.request.body;

    if (!data.user || data.user.trim() === "") {
        return handleValidationError(ctx, "User info is missing or invalid");
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

        const value = result?.value;
        if (!value) {
            return handleValidationError(ctx, "No matching user found");
        }

        const email = value.get('email') as string;
        const phone = value.get('phone') as string;
        const userName = value.get('userName') as string;
        const userId = value.get('id') as number;

        const sendResult = await sendForgotMessage(email, phone, userName, userId);
        if (!sendResult.success) {
            return handleValidationError(ctx, sendResult.error || "Failed to send message");
        }

        return handleSuccess(ctx, sendResult.body);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error handling forgot password");
    }
};

const sendForgotMessage = async (email: string, phone: string, userName: string, userId: number)
    : Promise<{ success: boolean; error?: string; body?: unknown }> => {

    logger.debug(`Sending lost password message for username: ${userName}`);

    if ((!email && !phone) || !userName) {
        return { success: false, error: "No contact info found" };
    }

    // Generate a unique token and store it in the db mapped to the user
    const token: string = crypto.randomUUID().replace(/-/g, "");

    try {
        const graph = await DBConnector.getGraph();
        // Upsert ForgotToken
        let res = await graph
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
        res = await graph.V()
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

        if (!res?.value) {
            return { success: false, error: "Failure creating token" };
        }

        if (email) {
            return await sendForgotEmail(email, userName, token);
        } else {
            return await sendForgotSMS(phone);
        }
    } catch (err) {
        logger.error("Error handling forgot message:", err);
        return { success: false, error: "Error handling forgot message" };
    }
};

const sendForgotEmail = async (email: string, userName: string, token: string) => {
    const replyTo = config.aws.ses.defaultReplyAddress;

    try {
        const emailResponse = await sendEmailByTemplate(FORGOT_PASSWORD_TEMPLATE, {
            destination: { ToAddresses: [email] },
            source: replyTo,
            template: FORGOT_PASSWORD_TEMPLATE,
            templateData: {
                assetHostname: config.aws.ses.imageHostName,
                hostname: config.frontHost,
                emailAddress: email,
                token,
                username: userName
            }
        });

        if (!emailResponse) {
            throw new Error("Email failed");
        }

        return {
            success: true,
            body: {
                status: "OK",
                title: "Email Sent",
                text: `We sent an email to ${obfuscateEmail(email)} with a link to reset your password`
            }
        };
    } catch (err) {
        logger.error("Error sending forgot email:", err);
        return { success: false, error: "Failed to send email" };
    }
};

const sendForgotSMS = async (phone: string) => {
    try {
        const message = `A request to reset your Linstagram password was made`;
        const response = await sendSMS(phone, message);

        if (!response) throw new Error("SMS failed");

        return {
            success: true,
            body: {
                status: "OK",
                title: "SMS Sent",
                text: `A password reset request was made. We've messaged ${obfuscatePhone(phone)} with more info.`
            }
        };
    } catch (err) {
        logger.error("Error sending forgot SMS:", err);
        return { success: false, error: "Failed to send SMS" };
    }
};