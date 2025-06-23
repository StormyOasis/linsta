import moment from "moment";
import crypto from "crypto";
import { Context } from "koa";
import { config, DBConnector, isEmail, isPhone, logger, metrics, SEND_CONFIRM_TEMPLATE, sendEmailByTemplate, sendSMS, withMetrics } from "@linsta/shared";
import { handleSuccess, handleValidationError } from "../../utils";

type SendCodeRequest = {
    user: string
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "accounts.sendconfirmcode";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const {user} = <SendCodeRequest>ctx.request?.query;

    if (!user || user.length < 3) {
        return handleValidationError(ctx, "Invalid confirmation input " );
    }

    // Determine if value passed an email address or phone num
    const isEmailAddr: boolean = isEmail(user);
    const isPhoneNum: boolean = isPhone(user);

    //Make sure there isn't any invalid email/phone
    if (!isPhoneNum && !isEmailAddr) {
        return handleValidationError(ctx, "Can't parse confirmation data");
    }

    const currentTime = moment();
    const sentTime: string = currentTime.format("YYYY-MM-DD HH:mm:ss.000");
    // generate a token to be used and store in the db
    const token: string = crypto.randomUUID().split("-")[0];

    try {
        const graph = await DBConnector.getGraph();
        // Upsert into DB
        const res = await graph
            .mergeV(new Map([["userData", user]]))
            .option(DBConnector.Merge().onCreate, new Map([
                [DBConnector.T().label, "ConfirmCode"],
                ["token", token],
                ["userData", user],
                ["sentTime", sentTime]
            ]))
            .option(DBConnector.Merge().onMatch, new Map([
                ["token", token],
                ["sentTime", sentTime]
            ]))
            .next();

        if (!res?.value) {
            return handleValidationError(ctx, "Failed to generate confirmation code");
        }

    } catch (err) {
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error processing confirmation data");
    }

    // Now send the email or text notification of the code
    try {
        if (isEmailAddr) {
            const sendRes = await sendEmailByTemplate(SEND_CONFIRM_TEMPLATE, {
                destination: { ToAddresses: [user] },
                source: config.aws.ses.defaultReplyAddress,
                template: SEND_CONFIRM_TEMPLATE,
                templateData: {
                    assetHostname: config.aws.ses.imageHostName,
                    emailAddress: user,
                    code: token
                }
            });
        } else {
            await sendSMS(user, token);
        }

        return handleSuccess(ctx, "OK");
    } catch (err) {
        logger.error((err as Error).message);
        metrics.increment(`${baseMetricsKey}.errorCount`);        
        return handleValidationError(ctx, "Error Sending confirmation code");
    }
}