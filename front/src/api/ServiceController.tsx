import axios from "axios";
import { authHeader, AuthUser } from "./Auth";
import { base64ToBlob, blobToBase64 } from "../utils/utils";

let host = "http://localhost:3001"; //TODO: From config or env

export type ServiceResponse = {
    data: any;
    status: number;
    statusText: string;
}

export const postAccountsAttempt = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/accounts/attempt/`, data);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
};

export const getAccountsCheckUserUnique = async (value: string | number): Promise<ServiceResponse> => {
    const res = await axios.get(`${host}/api/v1/accounts/check/${value}`);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText
    }
};

export const getAccountsSendVerifyNotification = async (userData: string): Promise<ServiceResponse>  => {
    const res = await axios.get(`${host}/api/v1/accounts/send_confirm_code?user=${userData}`);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText
    }
}

export const postLogin = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/accounts/login`, data);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postForgotPassword = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/accounts/forgot`, data);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postChangePassword = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/accounts/change_password`, data);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const getLocation = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.get(`${host}/api/v1/locations/get?term=${data}`, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const putSubmitPfp = async (data: any, userId: string): Promise<ServiceResponse> => {
    // Need to use multipart-formdata since we are uploading files
    const form = new FormData(); 
    
    // Pfp user data
    form.append("userId", userId);

    // Pfp file data
    form.append("fileData", data);

    const res = await axios.putForm(`${host}/api/v1/profiles/updatePfp`, form, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }    
}

export const putSubmitPost = async (data: any, authUser:AuthUser): Promise<ServiceResponse> => {    
    // Need to use multipart-formdata since we are uploading files
    const form = new FormData();

    // Include basic user info
    form.append("user", JSON.stringify({userId: authUser.id, userName: authUser.userName}));

    // Data that pertains to entire post, not just the images/videos contained within
    form.append("global", JSON.stringify({
        commentsDisabled: data.commentsDisabled,
        likesDisabled: data.likesDisabled,
        locationText: data.locationText,
        captionText: data.captionText
    }));

    const fileData:any[] = [];    
    const entries = data.entries.map((entry:any) => {
        fileData.push({id: entry.id, data: base64ToBlob(entry.data, entry.id)});
        return {
            id: entry.id,
            index: entry.index,
            isVideofile: entry.isVideoFile,
            alt: entry.altText,
        }
    });

    // Add the file list and associated info for each file
    form.append("entries", JSON.stringify(entries));

    // finally add the data for each file    
    fileData.map(entry => {
        form.append(entry.id, entry.data);
    });

    const res = await axios.putForm(`${host}/api/v1/posts/addPost`, form, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const getPosts = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/posts/getAll`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const getPostById = async (postId: string): Promise<ServiceResponse> => {
    const res = await axios.get(`${host}/api/v1/posts/getPostById?postId=${postId}`, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postToggleLike = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/posts/likePost`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postSetFollowStatus = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/accounts/follow`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postAddComment = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/comment/add`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postGetCommentsByPostId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/comment/getByPostId`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postToggleCommentLike = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/comment/toggleLike`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postGetProfileByUserId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/profiles/getByUserId`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postGetProfileByUserName = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/profiles/getByUserName`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postGetFollowersByUserId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/profiles/getFollowersByUserId`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postGetFollowingByUserId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/profiles/getFollowingByUserId`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postUpdateProfile = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/profiles/update`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postGetProfileStatsById = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/profiles/getStatsById`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postBulkGetProfileAndFollowStatus = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/profiles/bulkGetProfiles`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postGetPostsByUserId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/posts/getByUserId`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postUpdateProfileByUserId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/profiles/update`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postGetSingleFollowStatus = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/profiles/getSingleFollowStatus`, data, {headers: authHeader()});
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}
