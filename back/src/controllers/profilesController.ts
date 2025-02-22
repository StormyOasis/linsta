import { Context } from "koa";
import Metrics from "../metrics/Metrics";
import { sanitize } from "../utils/utils";
import logger from "../logger/logger";
import { count, countProfile, searchProfile, updateProfile } from "../Connectors/ESConnector";
import { Profile } from "../utils/types";
import DBConnector from "../Connectors/DBConnector";

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

type GetProfileByUserNameRequest = {
    userName: string;
};

export const getProfileByUserName = async (ctx: Context) => {
    Metrics.increment("profiles.getProfileByUserName");

    const data = <GetProfileByUserNameRequest>ctx.request.body;

    if (data.userName == null) {
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
                    userName: data.userName
                  }
                }
              }
        }, null);

        if(results.body.hits.hits.length !== 1) {
            throw new Error("Invalid profile name");
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

type GetProfileStatsByIdRequest = {
    userId: string;
};

type ProfileStats = {
    postCount: number;
    followerCount: number;
    followingCount: number;
};

export const getProfileStatsById = async(ctx: Context) => {
    Metrics.increment("profiles.getProfileStatsById");

    const data = <GetProfileStatsByIdRequest>ctx.request.body;

    if (data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    try {        
        const stats: ProfileStats = {
            postCount: 0,
            followerCount: 0,
            followingCount: 0
        };

        // First: Get the number of posts by the user

        // eslint-disable-next-line @typescript-eslint/no-explicit-any    
        const results: any = await count({
            nested: {
                path: "post.user",
                query: {
                    bool: {
                        must: [
                            {
                                match: {
                                    "post.user.userId": data.userId
                                }
                            }
                        ]
                    }
                }
            }
        });

        stats.postCount = results.body.count;

        // Second: Get the number of followers for this user
        const followerCount = await DBConnector.query(`
            SELECT COUNT(*) as count
            FROM Users u 
            INNER JOIN Follows f on f.FOLLOWS_USER_ID = u.id AND f.USER_ID = ?`, [data.userId]);        
        
        stats.followerCount = (followerCount.data as [{count: number}]).at(0)?.count as number;

        // Third: Get the number of users following this user
        const followingCount = await DBConnector.query(`
            SELECT COUNT(*) as count
            FROM Users u 
            INNER JOIN Follows f on f.FOLLOWS_USER_ID = u.id AND f.FOLLOWS_USER_ID = ?`, [data.userId]);        
        
        stats.followingCount = (followingCount.data as [{count: number}]).at(0)?.count as number;        

        ctx.body = stats;
        ctx.status = 200;
    } catch(err) {
        logger.error(err);
        ctx.status = 400;
        return;        
    }            
}