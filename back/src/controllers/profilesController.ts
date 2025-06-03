/*import { Context } from "koa";
import formidable from 'formidable';
import Metrics from "../metrics/Metrics";
import {getProfile, getVertexPropertySafe, handleValidationError, isUserAuthorized, updateProfileInRedis } from "../utils/utils";
import logger from "../logger/logger";
import ESConnector from "../connectors/ESConnector";
import { Profile, ProfileWithFollowStatus, ProfileWithFollowStatusInt } from "../utils/types";
import DBConnector, { EDGE_USER_FOLLOWS, EDGE_USER_TO_POST } from "../connectors/DBConnector";
import { removeFile, uploadFile } from "../connectors/AWSConnector";
import { extractFromMultipleTexts, getFileExtByMimeType, sanitizeInput } from "../utils/textUtils";

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
        return handleValidationError(ctx, "Invalid params passed");         
    }

    // Check if the logged-in user is trying to access their own data
    if (!isUserAuthorized(ctx, data.userId)) {
        // 403 - Forbidden
        return handleValidationError(ctx, "You do not have permission to access this data", 403);
    }    

    try {
        // Sanitize the user input
        const bio:string = sanitizeInput(data.bio);
        const pfp:string = sanitizeInput(data.pfp);
        const gender:string = sanitizeInput(data.gender);
        const pronouns:string = sanitizeInput(data.pronouns);
        const link:string = sanitizeInput(data.link);
        const firstName:string = sanitizeInput(data.firstName);
        const lastName:string = sanitizeInput(data.lastName);

        // Need to get the ES id of the profile
        const profile: Profile|null = await getProfile(data.userId, null);

        if(profile === null) {
            return handleValidationError(ctx, "Invalid profile for user id");    
        }

        // get the hashtags and mentions from bio text
        const { hashtags, mentions } = extractFromMultipleTexts([bio]);

        // Send updated profile data to ES
        await ESConnector.getInstance().updateProfile(profile.profileId, undefined, {
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

        if(results == null || results.value == null) {
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
        await updateProfileInRedis(profile);

        ctx.status = 200;
    } catch(err) {
        DBConnector.rollbackTransaction();
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error updating profile");   
    }        
}

type GetProfileByUserIdRequest = {
    userId: string;
};

export const getPostProfileByUserId = async (ctx: Context) => {
    Metrics.increment("profiles.getPostProfileByUserId");

    const data = <GetProfileByUserIdRequest>ctx.request.body;

    if (data.userId == null) {
        return handleValidationError(ctx, "Invalid params passed");   
    }

    try {
        const profile: Profile|null = await getProfile(data.userId, null);
        if(profile === null) {
            return handleValidationError(ctx, "Invalid profile");
        }

        ctx.body = profile;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Invalid profile");
    }        
}

type GetProfileByUserNameRequest = {
    userName: string;
};

export const getPostProfileByUserName = async (ctx: Context) => {
    Metrics.increment("profiles.getPostProfileByUserName");    

    const data = <GetProfileByUserNameRequest>ctx.request.body;

    if (data.userName == null) {
        return handleValidationError(ctx, "Invalid params passed");   
    }

    try {
        const profile: Profile|null = await getProfile(null, data.userName);
        if(profile === null) {
            return handleValidationError(ctx, "Invalid profile");
        }

        ctx.body = profile;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Invalid profile");      
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
        return handleValidationError(ctx, "Invalid params passed");   
    }

    try {        
        const stats: ProfileStats = {
            postCount: 0,
            followerCount: 0,
            followingCount: 0
        };

        // First: Get the number of posts by the user
        const postResult = await(await DBConnector.getGraph()).V(data.userId)
            .outE(EDGE_USER_TO_POST)
            .count()
            .next();

        if(postResult == null || postResult?.value == null) {
            return handleValidationError(ctx, "Error getting post count");   
        }
        stats.postCount = postResult.value;

        // Second: Get the number of users this profile is following
        const followerResult = await(await DBConnector.getGraph()).V(data.userId)
            .outE(EDGE_USER_FOLLOWS)
            .count()
            .next();

        if(followerResult == null || followerResult?.value == null) {
            return handleValidationError(ctx, "Error getting follower count");   
        }           

        stats.followingCount = followerResult.value;

        // Third: Get the number of users following this user
        const followingResult = await(await DBConnector.getGraph()).V(data.userId)
            .inE(EDGE_USER_FOLLOWS)
            .count()
            .next();

        if(followingResult == null || followingResult?.value == null) {
            return handleValidationError(ctx, "Error getting following count");   
        }                   
        
        stats.followerCount = followingResult.value;

        ctx.body = stats;
        ctx.status = 200;
    } catch(err) {
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting stats");        
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
        return handleValidationError(ctx, "Invalid params passed");   
    }
        
    // Check if the logged-in user is trying to access their own data
    if (!isUserAuthorized(ctx, data.userId)) {
        // 403 - Forbidden
        return handleValidationError(ctx, "You do not have permission to access this data", 403);
    }         

    try {
        const profile:Profile|null = await getProfile(data.userId, null);

        if(profile === null) {
            return handleValidationError(ctx, "Invalid profile");  
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

        profile.pfp = url;

        // Now update the profile data in ES with the new pfp 
        await ESConnector.getInstance().updateProfile(profile.profileId, undefined, {
            doc: {
                pfp: url,
            }
        });                

        // Update the entry in the DB
        const result = await(await DBConnector.getGraph()).V(profile.userId).property("pfp", url).next();
        if(result == null || result.value == null) {
            return handleValidationError(ctx, "Error updating profile");  
        }

        // Profile has just been updated, need to upsert into redis
        await updateProfileInRedis(profile);        

        ctx.body = url;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error updating profile");       
    }   
}

type GetFollowingByUserIdRequest = {
    userId: string;
};

export const getFollowingByUserId = async (ctx: Context) => {
    Metrics.increment("profiles.getFollowingByUserId");

    const data = <GetFollowingByUserIdRequest>ctx.request.body;

    if (data.userId == null) {
        return handleValidationError(ctx, "Invalid params passed"); 
    }

    try {
        // Find the following profiles from the specified user id
        // Now get the follow data
        const __ = DBConnector.__();
        const results = await(await DBConnector.getGraph()).V(data.userId)
            .hasLabel('User')
            .group()
            .by("userName")
            .by(
                __.out(EDGE_USER_FOLLOWS)
                .project('followers')
                .by()      
                .by(
                    __.unfold()
                    .hasLabel('User')
                    .values("userName")
                    .fold()
                )
                .unfold()
                .select(DBConnector.Column().values)
                .fold()                
            )
            .toList();     
            
        if(results == null) {
            ctx.status = 200;
            return;
        }

        const following:ProfileWithFollowStatus[] = [];
        for(const result of results) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map:Map<any, any> = (result as Map<any, any>);
            for(const entry of map) {                                
                for(const user of entry[1]) {                    
                    const vertexProperties = user.properties;
                    
                    const profile:ProfileWithFollowStatus = {                        
                        profileId: getVertexPropertySafe(vertexProperties, 'profileId'),
                        bio: getVertexPropertySafe(vertexProperties, 'bio'),
                        pfp: getVertexPropertySafe(vertexProperties, 'pfp'),
                        userId: user.id,
                        userName: getVertexPropertySafe(vertexProperties, 'userName'),
                        firstName: getVertexPropertySafe(vertexProperties, 'firstName'),
                        lastName: getVertexPropertySafe(vertexProperties, 'lastName'),
                        gender: getVertexPropertySafe(vertexProperties, 'gender'),
                        pronouns: getVertexPropertySafe(vertexProperties, 'pronouns'),
                        link: getVertexPropertySafe(vertexProperties, 'link'),
                        isFollowed: true
                    };

                    following.push(profile);                    
                }
            }
        }
       
        ctx.body = following;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting following users");     
    }
}

type GetFollowersByUserIdRequest = {
    userId: string;
};

export const getFollowersByUserId = async(ctx: Context) => {
    Metrics.increment("profiles.getFollowersByUserId");

    const data = <GetFollowersByUserIdRequest>ctx.request.body;

    if (data.userId == null) {
        return handleValidationError(ctx, "Invalid params passed"); 
    }

    try {
        // Find the follower profiles from the specified user id
        const __ = DBConnector.__();
        let results = await(await DBConnector.getGraph()).V(data.userId)
            .inE(EDGE_USER_FOLLOWS)  // Get all incoming 'user_follows' edges pointing to User1
            .outV()  // Get the vertices (users) who follow User1
            .where(__.not(__.hasId(data.userId)))  // Exclude User1 from the results            
            .toList();
           
        if(results == null) {
            ctx.status = 200;
            return;
        }

        const profileMap:Map<string, ProfileWithFollowStatus> = new Map<string, ProfileWithFollowStatus>();
        const followerIds:string[] = [];
        for(const result of results) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const vertex:any = result;
            const vertexProperties = vertex.properties;

            const profile:ProfileWithFollowStatus = {                        
                profileId: getVertexPropertySafe(vertexProperties, 'profileId'),
                bio: getVertexPropertySafe(vertexProperties, 'bio'),
                pfp: getVertexPropertySafe(vertexProperties, 'pfp'),
                userId: vertex.id,
                userName: getVertexPropertySafe(vertexProperties, 'userName'),
                firstName: getVertexPropertySafe(vertexProperties, 'firstName'),
                lastName: getVertexPropertySafe(vertexProperties, 'lastName'),
                gender: getVertexPropertySafe(vertexProperties, 'gender'),
                pronouns: getVertexPropertySafe(vertexProperties, 'pronouns'),
                link: getVertexPropertySafe(vertexProperties, 'link'),
                isFollowed: false
            };
            
            followerIds.push(vertex.id);
            profileMap.set(vertex.id, profile);
        }

        // We have all the users following userId. Now we need to see which of those users
        // userId is following back.
        // Ideally we could handle this and the previous query together in a single query
        // but couldn't get it to work and ChatGPT let me down too

        results = await(await DBConnector.getGraph()).V(data.userId)                              
            .out(EDGE_USER_FOLLOWS)           
            .filter(__.id().is(DBConnector.P().within(followerIds)))
            .dedup()
            .toList()               
            
        if(results == null) {
            ctx.status = 200;
            return;
        }            

        // results now contains the mutuals 
        for(const result of results) { 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const vertex:any = result;
            const profile: ProfileWithFollowStatus|undefined = profileMap.get(vertex.id);

            if(profile) {
                profile.isFollowed = true;
                profileMap.set(profile.userId, profile);
            }
        }

        const returnData:ProfileWithFollowStatus[] = Array.from(profileMap.values());
        ctx.body = returnData;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting followers");    
    }
}    

type SingleFollowRequest = {
    userId: string;
    checkUserId: string;
};

export const getSingleFollowStatus = async(ctx: Context) => {
    Metrics.increment("profiles.getSingleFollowStatus");

    const data = <SingleFollowRequest>ctx.request.body;

    if (data.userId == null || data.checkUserId == null) {
        return handleValidationError(ctx, "Invalid params passed"); 
    }   

    try {
        // Find the profile data of the given user ids
        const results = await(await DBConnector.getGraph())?.V(data.userId)
            .outE(EDGE_USER_FOLLOWS)
            .inV()
            .hasId(data.checkUserId)
            .count()
            .next();

        if(results == null || results.value === null) {
            return handleValidationError(ctx, "Error getting follow status"); 
        }

        ctx.body = results.value === 1;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting followers");    
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
        return handleValidationError(ctx, "Invalid params passed"); 
    }    

    try {
        // Find the profile data of the given user ids
        const results = await(await DBConnector.getGraph()).V(data.userIds).project("User").toList();
        if(results == null) {
            return handleValidationError(ctx, "Error getting profiles"); 
        }

        const profileMap:Map<string, ProfileWithFollowStatus> = new Map<string, ProfileWithFollowStatus>();
        
        for(const result of results) {    
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map:Map<any, any> = (result as Map<any, any>);
            if(map.has("User")) {                
                const vertex = map.get("User");
                const vertexProperties = vertex['properties'];

                const profile: ProfileWithFollowStatus = {
                    profileId: getVertexPropertySafe(vertexProperties, 'profileId'),
                    bio: getVertexPropertySafe(vertexProperties, 'bio'),
                    pfp: getVertexPropertySafe(vertexProperties, 'pfp'),
                    userId: vertex.id,
                    userName: getVertexPropertySafe(vertexProperties, 'userName'),
                    firstName: getVertexPropertySafe(vertexProperties, 'firstName'),
                    lastName: getVertexPropertySafe(vertexProperties, 'lastName'),
                    gender: getVertexPropertySafe(vertexProperties, 'gender'),
                    pronouns: getVertexPropertySafe(vertexProperties, 'pronouns'),
                    link: getVertexPropertySafe(vertexProperties, 'link'),
                    isFollowed: false
                };
                                
                profileMap.set(getVertexPropertySafe(vertexProperties, 'userName'), profile);
            }
        }

        // Now get the follow data
        const __ = DBConnector.__();
        const results2 = await(await DBConnector.getGraph()).V(data.userIds)
            .hasLabel('User')
            .group()
            .by("userName")
            .by(
                __.in_(EDGE_USER_FOLLOWS)
                .project('followers')
                .by()      
                .by(
                    __.unfold()
                    .hasLabel('User')
                    .values("userName")
                    .fold()
                )
                .unfold()
                .select(DBConnector.Column().values)
                .fold()                
            )
            .toList();     
            
        if(results2 == null) {
            ctx.status = 200;
            return;
        }

        const followerMap:Map<string, ProfileWithFollowStatus[]> = new Map<string, ProfileWithFollowStatus[]>();
        for(const result of results2) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map:Map<any, any> = (result as Map<any, any>);
            for(const entry of map) {
                const key = entry[0];
                
                const followers:ProfileWithFollowStatus[] = [];

                for(const user of entry[1]) {                    
                    const vertexProperties = user.properties;
                    
                    const profile:ProfileWithFollowStatus = {                        
                        profileId: getVertexPropertySafe(vertexProperties, 'profileId'),
                        bio: getVertexPropertySafe(vertexProperties, 'bio'),
                        pfp: getVertexPropertySafe(vertexProperties, 'pfp'),
                        userId: user.id,
                        userName: getVertexPropertySafe(vertexProperties, 'userName'),
                        firstName: getVertexPropertySafe(vertexProperties, 'firstName'),
                        lastName: getVertexPropertySafe(vertexProperties, 'lastName'),
                        gender: getVertexPropertySafe(vertexProperties, 'gender'),
                        pronouns: getVertexPropertySafe(vertexProperties, 'pronouns'),
                        link: getVertexPropertySafe(vertexProperties, 'link'),
                        isFollowed: false
                    };

                    followers.push(profile);
                }

                followerMap.set(key, followers);
            }
        }

        for(const [key, value] of profileMap) {            
            value.followers = followerMap.get(key);
        }

        const returnData:ProfileWithFollowStatusInt = {};        
        const iter = profileMap.entries();
        let element = await iter.next();
        while(!element.done) {
            const value = element.value;
            const profile:ProfileWithFollowStatus = Object.assign({}, value[1]);
            
            if(profile.followers != null) {                
                for(const follower of profile.followers) {
                    if(follower.userId === data.userId) {                        
                        profile.isFollowed = true;
                        break;
                    }
                }
            }
            returnData[profile.userId] = profile;

            element = await iter.next();
        }

        ctx.body = returnData;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error getting profiles");    
    }
}*/