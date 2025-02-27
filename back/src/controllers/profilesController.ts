import { Context } from "koa";
import formidable from 'formidable';
import Metrics from "../metrics/Metrics";
import { getFileExtByMimeType, sanitize, updateProfileInRedis } from "../utils/utils";
import logger from "../logger/logger";
import { count, updateProfile } from "../Connectors/ESConnector";
import { getProfileByUserNameEx, getProfileByUserIdEx } from "../utils/utils";
import { Profile } from "../utils/types";
import DBConnector from "../Connectors/DBConnector";
import { removeFile, uploadFile } from "../Connectors/AWSConnector";

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

export const updateProfileByUserId = async (ctx: Context) => {
    Metrics.increment("profiles.updateProfileByUserId");

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
        const profile: Profile|null = await getProfileByUserIdEx(data.userId);

        if(profile === null) {
            throw new Error("Invalid profile for user id");
        }

        // Send updated profile data to ES
        await updateProfile(profile.id, undefined, {
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

        // Update local profile object with the new values before storing in redis
        profile.bio = bio;
        profile.pfp = pfp;
        profile.gender = gender;
        profile.pronouns = pronouns;
        profile.link = link;
        profile.firstName = firstName;
        profile.lastName = lastName;

        // Profile has just been updated, need to upsert into redis
        await updateProfileInRedis(profile);

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
        const profile: Profile|null = await getProfileByUserIdEx(data.userId);
        if(profile === null) {
            throw new Error("Invalid profile");
        }

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
        const profile: Profile|null = await getProfileByUserNameEx(data.userName);
        if(profile === null) {
            throw new Error("Invalid profile");
        }

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
   /*     const followerCount = await DBConnector.query(`
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
*/
        ctx.body = stats;
        ctx.status = 200;
    } catch(err) {
        logger.error(err);
        ctx.status = 400;
        return;        
    }            
}

type PutPPfpByIdRequest = {
    userId: string;
};

export const putProfilePfp = async(ctx: Context) => {
    Metrics.increment("profiles.putProfilePfp");

    const data = <PutPPfpByIdRequest>ctx.request.body;
    const files:formidable.Files = ctx.request.files as formidable.Files;

    if (data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }    

    try {
        const profile:Profile|null = await getProfileByUserIdEx(data.userId);

        if(profile === null) {
            throw new Error("Invalid profile");
        }

        let url = "";
        // Upload the new file if we aren't clearing out the pfp property
        if(files != null && files.fileData != null) {
            const file:formidable.File = (files.fileData as formidable.File);            
            const result = await uploadFile(file, `pfp-${crypto.randomUUID()}`, data.userId, getFileExtByMimeType(file.mimetype));
            url = result.url;
        } else {
            // Remove the existing pfp from S3
            if(profile.pfp != null && profile.pfp.length > 0) {
                await removeFile(profile.pfp);
            }
        }

        // Now update the profile data with the new pfp 
        await updateProfile(profile.id, undefined, {
            doc: {
                pfp: url,
            }
        });

        profile.pfp = url;

        // Profile has just been updated, need to upsert into redis
        await updateProfileInRedis(profile);        

        ctx.body = url;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error(err);
        ctx.status = 400;
        return;        
    }    
}