import { Context } from "koa";
import Metrics from "../metrics/Metrics";
import { sanitize } from "../utils/utils";
import logger from "../logger/logger";
import { searchProfile, updateProfile } from "../Connectors/ESConnector";
import { Profile } from "../utils/types";

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

export const updateProfileById = async (ctx: Context) => {
    Metrics.increment("profiles.updateProfileById");

    const data = <UpdateProfileRequest>ctx.request.body;

    if (data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid userId passed" };
        return;
    }

    try {
        // Sanitize the user input
        const bio = sanitize(data.bio ? data.bio : "");
        const pfp = sanitize(data.pfp ? data.pfp : "");
        const gender = sanitize(data.gender ? data.gender : "");
        const pronouns = sanitize(data.pronouns ? data.pronouns : "");
        const link = sanitize(data.link ? data.link : "");
        const firstName = sanitize(data.firstName ? data.firstName : "");
        const lastName = sanitize(data.lastName ? data.lastName : "");

        // Need to get the ES id of the profile
        const results:any = await searchProfile({
            bool: {
                must: [{
                    match: {userId: data.userId}                    
                }]
            }
        }, null);
        
        if(results.body.hits.hits.length === 0) {
            throw new Error("Can't find profile");
        }

        const profileId = results.body.hits.hits[0]._id;

        // Send updated profile data to ES
        await updateProfile(profileId, undefined, {
            doc: {
                bio,
                pfp,
                gender,
                pronouns,
                link,
                firstName,
                lastName
            }
        });

        ctx.status = 200;
    } catch(err) {
        logger.error(err);
        ctx.status = 400;
        ctx.body = "Error updating profile";
        return;        
    }        
}

type GetProfileByUserIdRequest = {
    userId: string;
};

export const getProfileByUserId = async (ctx: Context) => {
    Metrics.increment("profiles.getProfileByUserId");

    const data = <GetProfileByUserIdRequest>ctx.request.body;

    if (data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: any = await searchProfile({
            bool: {
                must: {
                  match :{
                    userId: data.userId
                  }
                }
              }
        }, null);

        if(results.body.hits.hits.length !== 1) {
            throw new Error("Invalid profile id");
        }

        const profile: Profile = results.body.hits.hits[0]._source;

        ctx.body = profile;
        ctx.status = 200;
    } catch(err) {
        logger.error(err);
        ctx.status = 400;
        return;        
    }        
}