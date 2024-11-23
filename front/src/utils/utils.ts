import sanitizeHtml from 'sanitize-html';

import { HistoryType, Post } from "../api/types";
import { postSetFollowStatus } from '../api/ServiceController';

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

export const enableModal = (enable: boolean) => {
    const cont = document.getElementById("modalContainer");
    const sectionCont = document.getElementById("mainSectionContainer");

    if (cont && sectionCont) {
        if (enable) {
            cont.style.height = "100%";
            sectionCont.style.pointerEvents = "none";
        }
        else {
            cont.style.height = "0%";
            sectionCont.style.pointerEvents = "auto";
        }
    }
}

export const isPostLiked = (userName: string, post: Post):boolean => {
    if(post == null || userName == null) {
        return false;
    }

    const result = post.global.likes.filter((like:any) => like.userName === userName);

    return result.length > 0;
}

export const togglePostLikedState = (userName: string, userId: string, post: Post):(Post|null) => {
    if(post == null || userName == null || userId == null) {
        return null;
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

export const searchPostsIndexById = (postId: string, posts: Post[]):number => {
    if(postId === null || posts === null) {
        return -1;
    }
    
    let postIndex = -1;
    posts.forEach((post: Post, index: number) => {
        if(post.global.id === postId) {
            postIndex = index;
        }
    });

    return postIndex;
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
    //console.log( element.offsetHeight , element.scrollHeight)
    return element.offsetHeight < element.scrollHeight;
}

export const followUser = async (userId: string, followUserId: string, shouldFollow: boolean) => {
    if(userId === followUserId) {
        return true;
    }

    const data = {
        follow: shouldFollow,
        userId: userId,
        followerId: followUserId
    };

    const result = await postSetFollowStatus(data);
    
    return result.status === 200;
}