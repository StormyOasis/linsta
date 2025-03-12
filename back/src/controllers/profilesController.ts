import { Context } from "koa";
import formidable from 'formidable';
import Metrics from "../metrics/Metrics";
import { getFileExtByMimeType, sanitize, updateProfileInRedis } from "../utils/utils";
import logger from "../logger/logger";
import { searchProfile, updateProfile } from "../Connectors/ESConnector";
import { getProfileByUserNameEx, getProfileByUserIdEx } from "../utils/utils";
import { Profile } from "../utils/types";
import DBConnector, { EDGE_USER_FOLLOWED_BY, EDGE_USER_FOLLOWS } from "../Connectors/DBConnector";
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
        const postResult = await DBConnector.getGraph()?.V(data.userId).count().next();
        if(postResult == null || postResult?.value == null) {
            throw new Error("Failure getting post count");
        }     
        stats.postCount = postResult.value;

        // Second: Get the number of users this profile follows
        const followerResult = await DBConnector.getGraph()?.V(data.userId)
            .outE(EDGE_USER_FOLLOWS)
            .count()
            .next();

        if(followerResult == null || followerResult?.value == null) {
            throw new Error("Failure getting follower count");
        }           

        stats.followerCount = followerResult.value;

        // Third: Get the number of users following this user
        const followingResult = await DBConnector.getGraph()?.V(data.userId)
            .inE(EDGE_USER_FOLLOWS)
            .count()
            .next();

        if(followingResult == null || followingResult?.value == null) {
            throw new Error("Failure getting following count");
        }                   
        
        stats.followingCount = followingResult.value;

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

type BulkGetProfilesRequest = {
    userId: string;
    userIds: string[];
};

export const bulkGetProfilesAndFollowing = async(ctx: Context) => {
    Metrics.increment("profiles.bulkGetProfilesAndFollowing");

    const data = <BulkGetProfilesRequest>ctx.request.body;

    if (data.userId == null || data.userIds == null || data.userIds.length === 0) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }    

    try {
        // Find the profile data of the given user ids

        // Get the profile data from ES
        const results = await searchProfile({            
            terms: {
                userId: data.userIds
            }
        }, null);

        interface ProfileWithFollowStatus extends Profile {
            isFollowing: boolean;      
        }

        interface ProfileWithFollowStatusInt {
            [key: string]: ProfileWithFollowStatus;
        }        

        const resultMap:ProfileWithFollowStatusInt = {};       

        // eslint-disable-next-line @typescript-eslint/no-explicit-any        
        results.body.hits.hits.map((entry:any):ProfileWithFollowStatus => {
            const profile:ProfileWithFollowStatus = entry._source as ProfileWithFollowStatus;
            
            profile.isFollowing = false; //defaulting to false                    
            resultMap[profile.userId] = profile;

            return profile;
        });

        // Pull the "follow" data for the specified user and see if found in above profile list.
        // Get the users following this user
        const followingResult = await DBConnector.getGraph()?.V(data.userId)
            .in_(EDGE_USER_FOLLOWED_BY)
            .project("Follower")
            .by()
            .toList();

        if(followingResult != null) {
            for(const result of followingResult) {            
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const map:Map<any, any> = (result as Map<any, any>);                
                if(map.has("Follower")) {
                    const vertex = map.get("Follower");
                    // User at vertex is a follower to this user
                    // so mark it in the list 
                    if(resultMap[vertex.id] != null) {
                        resultMap[vertex.id].isFollowing = true;
                    }
                }
            }
        }
        
        ctx.body = resultMap;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error(err);
        ctx.status = 400;
        return;          
    }
}