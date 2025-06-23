import { APIGatewayProxyEvent } from 'aws-lambda';
import { getIpFromEvent, updateProfileInRedis, verifyJWT } from '../../utils';
import {
    DBConnector,
    getProfile,
    handleSuccess,
    handleValidationError,
    IndexService,
    logger,
    metrics,
    Profile,
    sanitizeInput,
    withMetrics,
    extractFromMultipleTexts
} from '@linsta/shared';

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

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "profiles.updateProfileByUserId";
    const ip = getIpFromEvent(event);

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: UpdateProfileRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data?.userId) {
        return handleValidationError("Invalid params passed");
    }

    // JWT Authorization: Only the owner can update
    const jwtPayload = verifyJWT(event, data.userId);
    if (!jwtPayload) {
        return handleValidationError("You do not have permission to access this data", 403);
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
            return handleValidationError("Invalid profile for user id");
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
            return handleValidationError("Error updating profile");
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

        return handleSuccess({ status: "OK" });
    } catch (err) {
        await DBConnector.rollbackTransaction();
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error updating profile");
    }
};