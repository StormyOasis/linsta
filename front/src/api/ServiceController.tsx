import axios from "axios";
import { authHeader, AuthUser, getCurrentUser } from "./Auth";
import { base64ToBlob } from "../utils/utils";
import { API_HOST } from "./config";
import { Profile } from "./types";

const API_VERSION = "v1";

export type ServiceResponse = {
    data: any;
    status: number;
    statusText: string;
}

const addRequestorId = (data: object) => {
    return {
        ...data,
        requestorUserId: getCurrentUser().id
    }
}

export const postAccountsAttempt = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/accounts/attempt/`, data);
    return res.data;
};

export const getAccountsCheckUserUnique = async (value: string | number): Promise<ServiceResponse> => {
    const res = await axios.get(`${API_HOST}/api/${API_VERSION}/accounts/check/${value}`);
    return res.data;
};

export const getAccountsSendVerifyNotification = async (userData: string): Promise<ServiceResponse> => {
    const res = await axios.get(`${API_HOST}/api/${API_VERSION}/accounts/sendConfirmCode?user=${userData}`);
    return res.data;
}

export const postLogin = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/accounts/login`, data);
    return res.data;
}

export const postForgotPassword = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/accounts/forgot`, data);
    return res.data;
}

export const postChangePassword = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/accounts/changePassword`, data);
    return res.data;
}

export const getLocation = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.get(`${API_HOST}/api/${API_VERSION}/locations/get?term=${data}&requestorUserId=${getCurrentUser()?.id}`, { headers: authHeader() });
    return res.data;
}

export const putSubmitPfp = async (data: any, userId: string): Promise<ServiceResponse> => {
    // Need to use multipart-formdata since we are uploading files
    const form = new FormData();

    // Pfp user data
    form.append("userId", userId);

    // Pfp file data
    form.append("fileData", data);

    form.append("requestorUserId", getCurrentUser()?.id);

    const res = await axios.putForm(`${API_HOST}/api/${API_VERSION}/profiles/updatePfp`, form, { headers: authHeader() });

    return res.data;
}

export const putSubmitPost = async (data: any, authUser: AuthUser): Promise<ServiceResponse> => {
    // Need to use multipart-formdata since we are uploading files
    const form = new FormData();

    // Include basic user info
    form.append("user", JSON.stringify({ userId: authUser.id, userName: authUser.userName }));

    form.append("requestorUserId", getCurrentUser()?.id);

    // Collaborator profiles, but don't waste bandwidth on the entire profile, just profileId and userName
    let collaborators: { profileId: string; userName: string }[] = [];
    if (data?.collabData?.selectedProfiles) {
        collaborators = data?.collabData?.selectedProfiles as Profile[];
    }

    // Data that pertains to entire post, not just the images/videos contained within
    form.append("global", JSON.stringify({
        commentsDisabled: data.commentsDisabled,
        likesDisabled: data.likesDisabled,
        locationText: data.locationText,
        captionText: data.captionText,
        collaborators
    }));

    const fileData: any[] = [];
    const entries = data.entries.map((entry: any) => {
        fileData.push({ id: entry.id, data: base64ToBlob(entry.data, entry.id) });
        return {
            id: entry.id,
            index: entry.index,
            isVideofile: entry.isVideoFile,
            altText: entry.altText,
        }
    });

    // Add the file list and associated info for each file
    form.append("entries", JSON.stringify(entries));

    // finally add the data for each file    
    fileData.map(entry => {
        form.append(entry.id, entry.data);
    });

    const res = await axios.putForm(`${API_HOST}/api/${API_VERSION}/posts/addPost`, form, { headers: authHeader() });

    return res.data;
}

export const getPosts = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/posts/getAllPostsByFollowing`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postGetPostByPostId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/posts/getPostById`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postToggleLike = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/posts/likePost`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postDeletePost = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/posts/deletePost`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postUpdatePost = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/posts/updatePost`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postSetFollowStatus = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/accounts/follow`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postAddComment = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/comment/add`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postDeleteComment = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/comment/delete`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postGetCommentsByPostId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/comment/getByPostId`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postToggleCommentLike = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/comment/toggleLike`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postGetProfileByUserId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/profiles/getByUserId`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postGetProfileByUserName = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/profiles/getByUserName`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postGetFollowersByUserId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/profiles/getFollowersByUserId`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postGetFollowingByUserId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/profiles/getFollowingByUserId`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postGetProfileStatsById = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/profiles/getStatsById`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postBulkGetProfileAndFollowStatus = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/profiles/bulkGetProfilesAndFollowing`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postGetPostsByUserId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/posts/getByUserId`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postUpdateProfileByUserId = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/profiles/update`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const postGetSingleFollowStatus = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/profiles/getSingleFollowStatus`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}

export const getSearch = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${API_HOST}/api/${API_VERSION}/search/search`, addRequestorId(data), { headers: authHeader() });
    return res.data;
}
export const getSuggestions = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.get(`${API_HOST}/api/${API_VERSION}/search/suggest`, {
        params: {
            q: data.query,
            type: data.type,
            resultSize: data.resultSize,
            requestorUserId: getCurrentUser()?.id
        },
        headers: authHeader()
    });
    return res.data;
}