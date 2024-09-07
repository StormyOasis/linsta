import { Destination, SendTemplatedEmailCommand } from "@aws-sdk/client-ses";
import { SESClient } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { LocationClient, SearchPlaceIndexForTextCommand } from "@aws-sdk/client-location";
import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";
import config from 'config';
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";

export const SEND_CONFIRM_TEMPLATE = `sendconfirmemail`;
export const FORGOT_PASSWORD_TEMPLATE = `forgotpasswordemail`;

export type SESTemplate = {
    destination: Destination;
    source: string;
    template: string;
    templateData: object;
}

export const sendEmailByTemplate = async (templateName: string, params: SESTemplate) => {
    const command = new SendTemplatedEmailCommand({
        Destination: params.destination,
        Source: params.source,
        Template: templateName,
        TemplateData: JSON.stringify(params.templateData)
    });

    try {
        const REGION:string = config.get("aws.region");    
        const sesClient = new SESClient({ region: REGION });        

        return await sesClient.send(command);        
    } catch (error) {
        logger.error("Failure sending email", error);
        Metrics.increment("aws.sesfailurecount");
        return {};
    }    
}

export const sendSMS = async (phoneNumber:string, message: string) => {
    try {
        const REGION:string = config.get("aws.region");    
        const snsClient = new SNSClient({region: REGION});

        const response = await snsClient.send(
            new PublishCommand({
              Message: message,
              PhoneNumber: phoneNumber,
            }),
          );

          console.log(response);

          return true;
    } catch (error) {
        logger.error("Failure sending sms", error);
        Metrics.increment("aws.smsfailurecount");

        return false;
    }  
}

export const getLocationData = async (term: string) => {
    const authHelper = await withAPIKey(config.get("aws.location.apiKey"));

    const client = new LocationClient({
        region: config.get("aws.region"),
        ...authHelper.getLocationClientConfig()
    });
    
    const input = {
        IndexName: `${config.get("aws.location.index")}`,
        Text: term
    }

    const command = new SearchPlaceIndexForTextCommand(input);
    const response = await client.send(command);

    return response;
}


