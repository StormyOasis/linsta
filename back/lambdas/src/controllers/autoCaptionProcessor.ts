import { SQSHandler } from "aws-lambda";
import {
    config,
    logger,
    AutoCaptionProcessingMessage,
    getImageCaption,
    updateEntryUrl,
} from "@linsta/shared";

export const handler: SQSHandler = async (event) => {
    for (const record of event.Records) {
        try {
            const message = JSON.parse(record.body) as AutoCaptionProcessingMessage;
            const { postId, entryId, currentAltText, key, url } = message.data;

            logger.info(`Processing ${key}...`);

            if (currentAltText && currentAltText?.length > 0) {
                // This entry has a caption so skip processing
                logger.info(`Skipping ${key}... with altText: ${currentAltText}`);
                continue;
            }
            
            // Call OpenAI service to generate caption
            const caption = await getImageCaption(url);

            // we should have a caption now so we need to update ES and redis
            await updateEntryUrl(postId, entryId, null, null, caption);

            logger.info(`Caption for entry ${entryId} updated to: ${caption}`);
        } catch (err) {
            logger.error(`Failed to process:`, err);
        }
    }
};
