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
            const { postId, entryId, currentAltText, key } = message.data;

            logger.info(`Processing ${key}...`);

            if (currentAltText && currentAltText.length > 0) {
                // This entry has a caption so skip processing
                continue;
            }

            const imageUrl = `https://${config.aws.s3.userMediaBucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
logger.info(`Image URL: ${imageUrl}`);
            // Call OpenAI service to generate caption
            const caption = await getImageCaption(imageUrl);

            // we should have a caption now so we need to update ES and redis
            await updateEntryUrl(postId, entryId, null, null, caption);

            logger.info(`Caption for entry ${entryId} updated to: ${caption}`);
        } catch (err) {
            logger.error(`Failed to process:`, err);
        }
    }
};
