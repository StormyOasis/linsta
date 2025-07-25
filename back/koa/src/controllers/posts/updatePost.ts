import { handleSuccess, handleValidationError } from '../../utils';
import {
    DBConnector,
    RedisConnector,
    EDGE_POST_TO_USER,
    withMetrics,
    metrics,
    logger,
    IndexService,
    sanitizeInput
} from '@linsta/shared';
import type { Profile, RequestWithRequestorId } from '@linsta/shared';
import { Context } from 'koa';

interface UpdatePostRequest extends RequestWithRequestorId {
    postId: string;
    fields: {
        commentsDisabled?: boolean;
        likesDisabled?: boolean;
        locationText?: string;
        captionText?: string;
        altText?: string[];
        collabData?: Record<string, Profile>;
    };
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "posts.updatepost";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const data:UpdatePostRequest = ctx.request.body;

    if (!data?.postId || !data.fields) {
        return handleValidationError(ctx, 'Invalid params passed');
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

        if (!results?.length) {
            return handleValidationError(ctx, "Error updating post");
        }

        const vertex = DBConnector.unwrapResult(results[0]);
        const parsed = DBConnector.parseGraphResult<{ post: { id: string, esId: string }, user: string }>(vertex, ["post", "user"]);
        const esId = parsed.post?.esId;
        const userId = parsed.user;

        if (!esId || !userId) {
            return handleValidationError(ctx, "Error updating post");
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

        const esResult = await IndexService.updatePost(esId, {
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
            return handleValidationError(ctx, "Error updating post");
        }

        // Step 3: Update the value in Redis by simply replacing the entire object
        const post = esResult.get?._source;
        if (!post) {
            return handleValidationError(ctx, "Error updating post");
        }
        await RedisConnector.set(esId, JSON.stringify(post));

        return handleSuccess(ctx, post);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error updating posts");
    }
};