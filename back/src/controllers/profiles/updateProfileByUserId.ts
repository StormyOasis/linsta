import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import Metrics from '../../metrics/Metrics';
import { getProfile, handleSuccess, handleValidationError, updateProfileInRedis, verifyJWT } from '../../utils/utils';
import logger from '../../logger/logger';
import { getESConnector } from '../../connectors/ESConnector';
import DBConnector from '../../connectors/DBConnector';
import { extractFromMultipleTexts, sanitizeInput } from '../../utils/textUtils';
import { Profile } from '../../utils/types';

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

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("profiles.updateProfileByUserId");

    let data: UpdateProfileRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.userId) {
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

        if (profile === null) {
            return handleValidationError("Invalid profile for user id");
        }

        // get the hashtags and mentions from bio text
        const { hashtags, mentions } = extractFromMultipleTexts([bio]);

        // Send updated profile data to ES
        await getESConnector().updateProfile(profile.profileId, undefined, {
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
        const results = await(await DBConnector.getGraph(true)).V(data.userId)
            .property("bio", bio)
            .property("pronouns", pronouns)
            .property("link", link)
            .property("gender", gender)
            .property("firstName", firstName)
            .property("lastName", lastName)
            .property("pfp", pfp)
            .next();

        if (results == null || results.value == null) {
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
        logger.error((err as Error).message);
        return handleValidationError("Error updating profile");
    }
};