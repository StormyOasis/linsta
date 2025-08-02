import sharp from 'sharp';
import { SQSHandler } from 'aws-lambda';
import { config, logger, getFileFromS3, uploadProcessedImage, removeFile, updateEntryUrl, ImageProcessingMessage } from '@linsta/shared';

export const handler: SQSHandler = async (event) => {    
    for (const record of event.Records) {
        try {
            const message = JSON.parse(record.body) as ImageProcessingMessage;
            const { postEsId, key, entryId, compress, isVideo } = message.data;

            logger.info(`Processing ${key}...`);

            if(isVideo) {
                // Not doing any processing for videos so skip
                continue;
            }

            const newKey = key.replace(/\.[^.]+$/, '.webp');
            const originalUrl = `https://${config.aws.s3.userMediaBucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

            // Download original
            const inputBuffer = await getFileFromS3(key);

            // Resize + convert to WebP
            const processedBuffer = await sharp(inputBuffer)
                .resize(1024)
                .webp({ quality: compress ? 75 : 100 })
                .toBuffer();

            // Upload .webp
            const newUrlBase = await uploadProcessedImage(newKey, processedBuffer);
            // Delete original
            await removeFile(originalUrl);

            // Append ?ts=... (Cache busting)
            const newUrl = convertS3ToCloudFront(`${newUrlBase.url}?ts=${Date.now()}`);
            await updateEntryUrl(postEsId, entryId, "image/webp", newUrl, null);

            logger.info(`Image ${entryId} updated to ${newUrl}`);
        } catch (err) {
            logger.error(`Failed to process:`, err);
        }
    }
};

const convertS3ToCloudFront = (s3Url: string) => {
  const s3Prefix = `https://${config.aws.s3.userMediaBucket}.s3.${config.aws.region}.amazonaws.com/`;
  const cloudfrontPrefix = config.aws.cloudfront.url;

  if (s3Url.startsWith(s3Prefix)) {
    return s3Url.replace(s3Prefix, cloudfrontPrefix);
  }
  return s3Url;
}