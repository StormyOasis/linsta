import sanitizeHtml from 'sanitize-html';

import { HistoryType, Post, Profile } from "../api/types";
import { postGetProfileByUserId, postSetFollowStatus } from '../api/ServiceController';
import { DEFAULT_PFP } from '../api/config';
import { getProfileByUserId } from 'src/Components/Redux/slices/profile.slice';

export const historyUtils: HistoryType = {
    navigate: null,
    location: null,
    isServer: true
}

export const validatePassword = (value: string): boolean => {
    const regex: RegExp =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&^])[A-Za-z\d@.#$!%*?&]{8,15}$/;

    return regex.test(value);
};

export const validateEmailPhone = (value: string): boolean => {
    if (value == null) {
        return false;
    }

    const phoneRegex = /(?:([+]\d{1,4})[-.\s]?)?(?:[(](\d{1,3})[)][-.\s]?)?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9})/g;
    const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return emailRegex.test(value) || phoneRegex.test(value);
};

export const validateFullName = (value: string): boolean => {
    return (
        value !== null &&
        value.trim().length > 0 &&
        value.trim().split(" ").length > 1
    );
};

export const validateUrl = (text: string|undefined): boolean => {
    if(text == null || text.length === 0) {
        return true; //No url entered should be considered valid
    }

    try {
        new URL(text);
        return true;
    } catch (e) {
        return false;
    }
}

export const isVideoFileFromPath = (path: string): boolean => {
    if (path == null || path.trim().length < 4) {
        throw new Error("Invalid path");
    }

    const validVideoExtentions: string[] = ["avif", "ogm", "wmv", "mpg", "webm", "ogv", "mov", "asx", "mpeg", "mp4", "m4v", "avi"];
    const ext = path.toLowerCase().substring(path.lastIndexOf(".") + 1);

    return validVideoExtentions.includes(ext);
}

export const isVideoFileFromType = (type: string): boolean => {
    if (type == null || type.trim().length < 4) {
        throw new Error("Invalid type");
    }

    return type.toLowerCase().includes("video");
}

export const base64ToBlob = (base64String: string, outFileName: string): File | null => {
    if (base64String === null || base64String.length === 0)
        return null;

    const contentType = base64String.substring(5, base64String.indexOf(';'));
    const data = base64String.substring(base64String.indexOf(",") + 1);

    return base64ToBlobEx(data, contentType, outFileName);
}

export const base64ToBlobEx = (base64String: string, contentType: string, outFileName: string) => {
    const sliceSize = 512;

    var byteCharacters = atob(base64String);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    return new File(byteArrays, outFileName, { type: contentType });
}

export const blobToBase64 = async (blob: any) => {
    blob = await createBlob(blob);

    return new Promise((resolve, _reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

export const createBlob = async (url: string) => {
    try {
        const response = await fetch(url);
        const data = await response.blob();
        return data;
    } catch (err) {
        console.log(err);
    }
    return null;
}

export const extractMimeTypeFromBase64 = (data: string): string | null => {
    if (data == null || data.length === 0) {
        return null;
    }

    return data.substring(5, data.indexOf(';') + 1);
}

export const extractFrameFromVideo = async (video: HTMLVideoElement): Promise<string | null> => {
    if (video == null) {
        return null;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext('2d');

    if (ctx == null) {
        return null;
    }

    canvas.height = video.videoHeight || parseInt(video.style.height);
    canvas.width = video.videoWidth || parseInt(video.style.width);

    ctx.drawImage(video, 0, 0);

    return new Promise((resolve, _reject) => {
        canvas.toBlob((file: any) =>
            resolve(URL.createObjectURL(file))
            , 'image/jpeg')
    })
}

export const dateDiff = (dateTime: Date) => {
    if(dateTime == null) {
        return "now";
    }
    
    const now = new Date().getTime();
    const dateTimeMilli = new Date(dateTime).getTime();
    const diff = new Date(now - dateTimeMilli);
    let diffMilli = diff.getTime();

    const days = Math.floor(diffMilli / 1000 / 60 / 60 / 24);
    diffMilli = diffMilli - (days * 1000*60*60*24);

    const weeks = Math.floor(days / 7.0);
    const hours = Math.floor(diffMilli / 1000 / 60 / 60);
    diffMilli = diffMilli - (hours * 1000 * 60 * 60);
    const mins = Math.floor(diffMilli / 1000 / 60);

    if(weeks >= 1) {
        return weeks + "w";
    }

    if(days >= 1) {
        return days + "d";
    }

    if(hours >= 1) {
        return hours + "h";
    } 
    
    if(mins >= 1) {
        return mins + "m";
    }

    return "now";
}

export const getDateAsText = (date: Date) => {
    return new Date(date).toLocaleDateString('en-us', { year: "numeric", month: "long", day: "numeric" });
}

export const getPostFromListById = (postId: string, posts: Post[]):Post => {
    for(let post of posts) {
        if(post.postId === postId) {
            return post;
        }
    }
    return {} as any;
}

export const isPostLiked = (userName: string, post: Post):boolean => {
    if(post == null || userName == null || post.global?.likes == null) {
        return false;
    }

    const result = post.global.likes.filter((like:any) => like.userName === userName);

    return result.length > 0;    
}

export const togglePostLikedState = (userName: string, userId: string, post: Post):(Post|null) => {    
    if(post == null || userName == null || userId == null) {
        return null;
    }
    
    if(post.global.likes == null) {
        post.global.likes = [];
    }

    const index = post.global.likes.findIndex((value:any) => value.userName === userName);
    if(index === -1) {
        // Username is not in the post's like list, so add it
        post.global.likes.push({userName, userId});
    } else {
        // Remove the username from the post's like list
        post.global.likes.splice(index, 1);
    }

    return post;
}

export const getSanitizedText = (text: string):[string, string] => {
    if(text == null || text.length === 0)
        return [text, text];

    const textHtml = sanitizeHtml(text, {
        allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'br', 'sub', 'sup' ],
        allowedAttributes: {
          'a': [ 'href' ]
        },
        allowedIframeHostnames: []
    }).trim();

    const textStripped = sanitizeHtml(text, {
        allowedTags: [],
        allowedAttributes: {},
        allowedIframeHostnames: []
    }).trim();      

    return [textHtml, textStripped];
}

export const isOverflowed = (id: string):boolean => {
    const element = document.getElementById(id);
    
    if(element == null) {
        return false;
    }

    return element.offsetHeight < element.scrollHeight;
}

export const followUser = async (userId: string, followUserId: string, shouldFollow: boolean) => {
    if(userId === followUserId) {
        return true;
    }

    const data = {
        follow: shouldFollow,
        userId: userId,
        followId: followUserId
    };

    const result = await postSetFollowStatus(data);
    
    return result.status === 200;
}

export const getPfpFromProfile = (profile: Profile|null):string => {
    if(profile === null || profile.pfp == null || profile.pfp.length <= 0) {
        return DEFAULT_PFP;
    }

    return profile.pfp;
}

export const getPfpFromPost = (post: Post):string => {
    if(post.user.pfp == null || post.user.pfp.length === 0) {
       /* const result = postGetProfileByUserId({userId: post.user.userId});
        if(result == null || result.status !== 200) {
            return DEFAULT_PFP;
        }        
        return result.data.pfp;*/
        return DEFAULT_PFP;
    }    

    return post.user.pfp;
}

export const splitFullName = (fullName:string) => {
    const names = fullName.trim().split(' ');
    const firstName = names[0];
    const lastName = names[names.length - 1];
    const middleNames = names.slice(1, names.length - 1).join(' ');

    return { firstName, middleNames, lastName };
}
