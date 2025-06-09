import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import { getESConnector } from '../../connectors/ESConnector';
import RedisConnector from '../../connectors/RedisConnector';
import DBConnector, { EDGE_POST_TO_USER } from '../../connectors/DBConnector';
import { handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';
import { sanitizeInput } from '../../utils/textUtils';
import { Profile, RequestWithRequestorId } from '../../utils/types';

interface UpdatePostRequest extends RequestWithRequestorId {
    postId: string;
    fields: {
        commentsDisabled?: boolean;
        likesDisabled?: boolean;
        locationText?: string;
        captionText?: string;
        altText?: string[];
        collabData?:Record<string, Profile>;
    };
}

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "posts.updatepost";
    return await withMetrics(baseMetricsKey, event.headers,async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: UpdatePostRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data || !data.postId || !data.fields) {
        return handleValidationError("Invalid params passed");
    }

    // JWT Authorization: Only the owner can update
    const jwtPayload = verifyJWT(event, data.requestorUserId);
    if (!jwtPayload) {
        return handleValidationError("You do not have permission to access this data", 403);
    }

    try {
        const __ = DBConnector.__();

        // Step 1: Get the userId and esId of the post
        const results = await (await DBConnector.getGraph())
            .V(data.postId)
            .as("post")
            .out(EDGE_POST_TO_USER)
            .as("user")
            .select("post", "user")
            .by(
                __.project("id", "esId")
                    .by(DBConnector.T().id)
                    .by("esId")
            )
            .by(DBConnector.T().id)
            .toList();

        if (!results || results.length === 0) {
            return handleValidationError("Error updating post");
        }

        let esId: string | null = null;
        let userId: string | null = null;
        for (const entry of results) {
            const vertex = DBConnector.unwrapResult(entry);
            const parsed = DBConnector.parseGraphResult<{ post: { id: string, esId: string }, user: string }>(vertex, ["post", "user"]);
            esId = parsed.post?.esId;
            userId = parsed.user;
        }

        if (!esId || !userId) {
            return handleValidationError("Error updating post");
        }

        // Step 2: Update the post in ES with the supplied fields
        const params: Record<string, unknown> = {
            commentsDisabled: data.fields.commentsDisabled != null ? data.fields.commentsDisabled : null,
            likesDisabled: data.fields.likesDisabled != null ? data.fields.likesDisabled : null,
            locationText: data.fields.locationText != null ? sanitizeInput(data.fields.locationText) : null,
            captionText: data.fields.captionText != null ? sanitizeInput(data.fields.captionText) : null,
            altText: data.fields.altText != null ? data.fields.altText.map((entry: string) => sanitizeInput(entry)) : null,
            collabData: data.fields.collabData != null ? data.fields.collabData : null
        };

        const esResult = await getESConnector().update(esId, {
            source:
                `
                // Update only the fields with non-null matching parameters
                if (params.containsKey('commentsDisabled') && params.commentsDisabled != null) {
                    ctx._source.global.commentsDisabled = params.commentsDisabled;
                }
                if (params.containsKey('likesDisabled') && params.likesDisabled != null) {
                    ctx._source.global.likesDisabled = params.likesDisabled;
                }
                if (params.containsKey('locationText') && params.locationText != null) {
                    ctx._source.global.locationText = params.locationText;
                }
                if (params.containsKey('captionText') && params.captionText != null) {
                    ctx._source.global.captionText = params.captionText;
                }
                if (params.containsKey('collabData') && params.collabData != null) {
                    ctx._source.global.collaborators = params.collabData.selectedProfiles;
                }                    
                
                // Update altText for media items using index-matched altText array
                if (ctx._source.containsKey('media') && params.altText != null) {                    
                    int mediaSize = ctx._source.media.size();
                    int altTextSize = params.altText.size();

                    // Calculate the smaller of the two lengths
                    int minSize;
                    if (mediaSize < altTextSize) {
                        minSize = mediaSize;
                    } else {
                        minSize = altTextSize;
                    }              
                    
                    // Iterate through the media array and update the altText
                    for (int i = 0; i < minSize; i++) {
                        if (params.altText[i] != null) {
                            ctx._source.media[i].altText = params.altText[i];
                        }
                    }
                }
                    
                Set tags = new HashSet();
                Set mentions = new HashSet();
                Pattern hashtagPattern = /#\\w+/;
                Pattern mentionPattern = /@\\w+/;

                if (ctx._source.containsKey('global') && ctx._source.global != null) {
                    if (ctx._source.global.containsKey('locationText') && ctx._source.global.locationText instanceof String) {
                        String text = ctx._source.global.locationText;
                        Matcher tagMatcher = hashtagPattern.matcher(text);
                        while (tagMatcher.find()) {
                            tags.add(tagMatcher.group().toLowerCase());
                        }
                        Matcher mentionMatcher = mentionPattern.matcher(text);
                        while (mentionMatcher.find()) {
                            mentions.add(mentionMatcher.group().toLowerCase());
                        }
                    }

                    if (ctx._source.global.containsKey('captionText') && ctx._source.global.captionText instanceof String) {
                        String text = ctx._source.global.captionText;
                        Matcher tagMatcher = hashtagPattern.matcher(text);
                        while (tagMatcher.find()) {
                            tags.add(tagMatcher.group().toLowerCase());
                        }
                        Matcher mentionMatcher = mentionPattern.matcher(text);
                        while (mentionMatcher.find()) {
                            mentions.add(mentionMatcher.group().toLowerCase());
                        }
                    }
                }

                if (ctx._source.containsKey("media") && ctx._source.media instanceof List) {
                    for (item in ctx._source.media) {
                        if (item.containsKey("altText") && item.altText instanceof String) {
                            String text = item.altText;
                            Matcher tagMatcher = hashtagPattern.matcher(text);
                            while (tagMatcher.find()) {
                                tags.add(tagMatcher.group().toLowerCase());
                            }
                            Matcher mentionMatcher = mentionPattern.matcher(text);
                            while (mentionMatcher.find()) {
                                mentions.add(mentionMatcher.group().toLowerCase());
                            }
                        }
                    }
                }

                ctx._source.hashtags = new ArrayList(tags);
                ctx._source.mentions = new ArrayList(mentions);   
            `,
            "params": params,
            "lang": "painless"
        }, true);

        if (!esResult || esResult?.result !== "updated") {
            return handleValidationError("Error updating post");
        }

        // Step 3: Update the value in Redis by simply replacing the entire object
        const post = esResult.get?._source;
        if (!post) {
            return handleValidationError("Error updating post");
        }
        await RedisConnector.set(esResult._id, JSON.stringify(post));

        return handleSuccess(post);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error updating posts");
    }
};