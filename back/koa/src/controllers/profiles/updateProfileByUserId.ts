import {
    DBConnector,
    getProfile,
    IndexService,
    logger,
    metrics,
    Profile,
    sanitizeInput,
    withMetrics,
    extractFromMultipleTexts,
    updateProfileInRedis
} from '@linsta/shared';
import { Context } from 'koa';
import { handleValidationError, handleSuccess } from '../../utils';

type UpdateProfileRequest = {
    bio?: string | null;
    pfp?: string | null;
    gender?: string | null;
    pronouns?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    link?: string | null;
    userId: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "profiles.updateprofilebyuserid";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const data: UpdateProfileRequest = ctx.request.body;

    if (!data?.userId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        // Sanitize the user input
        const bio: string = sanitizeInput(data.bio);
        const pfp: string = sanitizeInput(data.pfp);
        const gender: string = sanitizeInput(data.gender);
        const pronouns: string = sanitizeInput(data.pronouns);
        const link: string = sanitizeInput(data.link);
        const firstName: string = sanitizeInput(data.firstName);
        const lastName: string = sanitizeInput(data.lastName);

        // Need to get the ES id of the profile
        const profile: Profile | null = await getProfile(data.userId, null);

        if (!profile) {
            return handleValidationError(ctx, "Invalid profile for user id");
        }

        // get the hashtags and mentions from bio text
        const { hashtags, mentions } = extractFromMultipleTexts([bio]);

        // Send updated profile data to ES
        await IndexService.updateProfile(profile.profileId, undefined, {
            doc: {
                bio,
                pfp,
                gender,
                pronouns,
                link,
                firstName,
                lastName,
                hashtags,
                mentions
            }
        });

        // Update the profile in the DB
        await DBConnector.beginTransaction();
        const result = await (await DBConnector.getGraph(true)).V(data.userId)
            .property("bio", bio)
            .property("pronouns", pronouns)
            .property("link", link)
            .property("gender", gender)
            .property("firstName", firstName)
            .property("lastName", lastName)
            .property("pfp", pfp)
            .next();

        if (!result?.value) {
            await DBConnector.rollbackTransaction();
            return handleValidationError(ctx, "Error updating profile");
        }

        await DBConnector.commitTransaction();

        // Update local profile object with the new values before storing in redis
        profile.bio = bio;
        profile.pfp = pfp;
        profile.gender = gender;
        profile.pronouns = pronouns;
        profile.link = link;
        profile.firstName = firstName;
        profile.lastName = lastName;

        // Profile has just been updated, need to upsert into redis
        await updateProfileInRedis(profile, data.userId);

        return handleSuccess(ctx, { status: "OK" });
    } catch (err) {
        await DBConnector.rollbackTransaction();
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error updating profile");
    }
};