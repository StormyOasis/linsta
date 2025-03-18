import { Context } from "koa";
import formidable from 'formidable';
import Metrics from "../metrics/Metrics";
import { getFileExtByMimeType, getVertexPropertySafe, sanitize, updateProfileInRedis } from "../utils/utils";
import logger from "../logger/logger";
import { search, searchWithPagination, updateProfile } from "../Connectors/ESConnector";
import { getProfileByUserName, getProfileByUserId } from "../utils/utils";
import { Entry, Post, Profile, ProfileWithFollowStatus, ProfileWithFollowStatusInt } from "../utils/types";
import DBConnector, { EDGE_USER_FOLLOWS } from "../Connectors/DBConnector";
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
        const profile: Profile|null = await getProfileByUserId(data.userId);

        if(profile === null) {
            throw new Error("Invalid profile for user id");
        }

        // Send updated profile data to ES
        await updateProfile(profile.profileId, undefined, {
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

        // Update the profile in the DB
        DBConnector.beginTransaction();
        const results = await DBConnector.getGraph(true)?.V(data.userId)
            .property("bio", bio)
            .property("pronouns", pronouns)
            .property("link", link)
            .property("gender", gender)
            .property("firstName", firstName)
            .property("lastName", lastName)
            .property("pfp", pfp)
            .next();

        if(results == null || results.value == null) {
            throw new Error("Error updating DB");
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
        logger.error(err);
        ctx.status = 400;
        ctx.body = "Error updating profile";
        return;        
    }        
}

type GetProfileByUserIdRequest = {
    userId: string;
};

export const getPostProfileByUserId = async (ctx: Context) => {
    Metrics.increment("profiles.getPostProfileByUserId");

    const data = <GetProfileByUserIdRequest>ctx.request.body;

    if (data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    try {
        const profile: Profile|null = await getProfileByUserId(data.userId);
        if(profile === null) {
            throw new Error("Invalid profile");
        }

        ctx.body = profile;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error(err);
        ctx.status = 400;
        return;        
    }        
}

type GetProfileByUserNameRequest = {
    userName: string;
};

export const getPostProfileByUserName = async (ctx: Context) => {
    Metrics.increment("profiles.getPostProfileByUserName");    

    const data = <GetProfileByUserNameRequest>ctx.request.body;

    if (data.userName == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    try {
        const profile: Profile|null = await getProfileByUserName(data.userName);
        if(profile === null) {
            throw new Error("Invalid profile");
        }

        ctx.body = profile;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
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

        // Second: Get the number of users this profile is following
        const followerResult = await DBConnector.getGraph()?.V(data.userId)
            .outE(EDGE_USER_FOLLOWS)
            .count()
            .next();

        if(followerResult == null || followerResult?.value == null) {
            throw new Error("Failure getting follower count");
        }           

        stats.followingCount = followerResult.value;

        // Third: Get the number of users following this user
        const followingResult = await DBConnector.getGraph()?.V(data.userId)
            .inE(EDGE_USER_FOLLOWS)
            .count()
            .next();

        if(followingResult == null || followingResult?.value == null) {
            throw new Error("Failure getting following count");
        }                   
        
        stats.followerCount = followingResult.value;

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
        const profile:Profile|null = await getProfileByUserId(data.userId);

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

        profile.pfp = url;

        // Now update the profile data in ES with the new pfp 
        await updateProfile(profile.profileId, undefined, {
            doc: {
                pfp: url,
            }
        });                

        // Update the entry in the DB
        const result = await DBConnector.getGraph()?.V(profile.userId).property("pfp", url).next();
        if(result == null || result.value == null) {
            throw new Error("Error updating DB");
        }

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

type GetFollowingByUserIdRequest = {
    userId: string;
};

export const getFollowingByUserId = async(ctx: Context) => {
    Metrics.increment("profiles.getFollowingByUserId");

    const data = <GetFollowingByUserIdRequest>ctx.request.body;

    if (data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid user id" };
        return;
    }

    try {

        // Find the following profiles from the specified user id

        // Now get the follow data
        const __ = DBConnector.__();
        const results = await DBConnector.getGraph()?.V(data.userId)
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
        logger.error(err);
        ctx.status = 400;       
    }
}

type GetFollowersByUserIdRequest = {
    userId: string;
};

export const getFollowersByUserId = async(ctx: Context) => {
    Metrics.increment("profiles.getFollowersByUserId");

    const data = <GetFollowersByUserIdRequest>ctx.request.body;

    if (data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid user id" };
        return;
    }

    try {
        // Find the follower profiles from the specified user id
        const __ = DBConnector.__();
        let results = await DBConnector.getGraph()?.V(data.userId)
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

        results = await DBConnector.getGraph()?.V(data.userId)                              
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

            if(profile == null) {
                continue;
            }

            profile.isFollowed = true;
            profileMap.set(profile.userId, profile);
        }

        const returnData:ProfileWithFollowStatus[] = [];
        const iter = profileMap.entries();
        let element = await iter.next();
        while(!element.done) {
            const value = element.value;
            const profile:ProfileWithFollowStatus = Object.assign({}, value[1]);
            
            returnData.push(profile);

            element = await iter.next();
        }        

        ctx.body = returnData;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error(err);
        ctx.status = 400;       
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
        const results = await DBConnector.getGraph()?.V(data.userIds).project("User").toList();
        if(results == null) {
            throw new Error("Error getting profiles");
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
        const results2 = await DBConnector.getGraph()?.V(data.userIds)
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
        logger.error(err);
        ctx.status = 400;
        return;          
    }
}

type GetMediaByUserIdRequest = {
    userId: string;
    dateTime?: string;
    postId?: string;
};

type GetMediaByUserIdResponse = {
    media: Entry[];
    dateTime: string;
    postId: string;    
}

export const getMediaByUserId = async (ctx: Context) => {
    Metrics.increment("profiles.getMediaByUserId");    

    const data = <GetMediaByUserIdRequest>ctx.request.body;

    if (data.userId == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params passed" };
        return;
    }

    try {
        // Return a paginated list of the user's media entries

        // Since the media entries have a userId included we can
        // query them directly, bypassing having to get the full post
        // from ES.

        const results = await searchWithPagination(
            {
                size: 1,
                query: {
                    nested: {
                        path: "post.media",
                        query: {
                            bool: {
                                must: [
                                    {
                                        match: {
                                            "post.media.userId": data.userId
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },
                sort: [
                    {
                        "post.global.dateTime": {
                            "order": "asc",
                            "nested": {
                                "path": "post.global"
                            }
                        }
                    },
                    {
                        "post.media.postId": {
                            "order": "asc",
                            "nested": {
                                "path": "post.media"
                            }
                        }
                    }
                ]
            }, 1
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hits:any = results.body.hits.hits;
        const post:Post = hits[0]._source.post;

        const response: GetMediaByUserIdResponse = {
            media: post.media,
            postId: hits.sort[0],
            dateTime: hits.sort[1],            
        };

        ctx.body = response;
        ctx.status = 200;
    } catch(err) {
        console.log(err);
        logger.error(err);
        ctx.status = 400;
        return;        
    }        
}
