import { APIGatewayProxyEvent } from 'aws-lambda';
import moment from "moment";
import crypto from "crypto";
import DBConnector from '../../connectors/DBConnector';
import { isEmail, isPhone } from '../../utils/textUtils';
import config from '../../config';
import { SEND_CONFIRM_TEMPLATE, sendEmailByTemplate, sendSMS } from '../../connectors/AWSConnector';
import logger from "../../logger/logger";
import Metrics, { withMetrics } from "../../metrics/Metrics";
import { handleSuccess, handleValidationError } from '../../utils/utils';

type SendCodeRequest = {
    user: string
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "accounts.sendconfirmcode";
    return await withMetrics(baseMetricsKey, event, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    const userData = (event.queryStringParameters as SendCodeRequest)?.user;

    if (!userData || userData.length < 3) {
        return handleValidationError("Invalid confirmation input");
    }

    // Determine if value passed an email address or phone num
    const isEmailAddr: boolean = isEmail(userData);
    const isPhoneNum: boolean = isPhone(userData);

    //Make sure there isn't any invalid email/phone
    if (!isPhoneNum && !isEmailAddr) {
        return handleValidationError("Can't parse confirmation data");
    }

    const currentTime = moment();
    const sentTime: string = currentTime.format("YYYY-MM-DD HH:mm:ss.000");
    // generate a token to be used and store in the db
    const token: string = crypto.randomUUID().split("-")[0];

    try {
        // Upsert into DB
        const res = await (await DBConnector.getGraph())
            .mergeV(new Map([["userData", userData]]))
            .option(DBConnector.Merge().onCreate, new Map([
                [DBConnector.T().label, "ConfirmCode"],
                ["token", token],
                ["userData", userData],
                ["sentTime", sentTime]
            ]))
            .option(DBConnector.Merge().onMatch, new Map([
                ["token", token],
                ["sentTime", sentTime]
            ]))
            .next();

        if (res == null || res?.value == null) {
            return handleValidationError("Failed to generate confirmation code");
        }

    } catch (err) {
        logger.error((err as Error).message);
        return handleValidationError("Error processing confirmation data");
    }

    // Now send the email or text notification of the code
    try {
        logger.info(`B4 mail ${isEmailAddr}`)
        if (isEmailAddr) {
            const sendRes = await sendEmailByTemplate(SEND_CONFIRM_TEMPLATE, {
                destination: { ToAddresses: [userData] },
                source: config.aws.ses.defaultReplyAddress,
                template: SEND_CONFIRM_TEMPLATE,
                templateData: {
                    assetHostname: config.aws.ses.imageHostName,
                    emailAddress: userData,
                    code: token
                }
            });
            logger.info(sendRes);
        } else {
            await sendSMS(userData, token);
        }

        return handleSuccess("OK");
    } catch (err) {
        logger.error((err as Error).message);
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);        
        return handleValidationError("Error Sending confirmation code");
    }
}