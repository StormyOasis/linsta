import sanitizeHtml from 'sanitize-html';

import { HistoryType, Post, Profile } from "../api/types";
import { postSetFollowStatus, postUpdatePost } from '../api/ServiceController';
import { DEFAULT_PFP } from '../api/config';

/**
 * Utility object for managing navigation and history state.
 */
export const historyUtils: HistoryType = {
    navigate: null,
    location: null,
    isServer: true
}

// Regular expressions for validation
const validatePasswordRegex: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&^_])[A-Za-z\d@.#$!%*?&_]{8,32}$/;
const phoneRegex: RegExp = /(?:([+]\d{1,4})[-.\s]?)?(?:[(](\d{1,3})[)][-.\s]?)?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9})/g;
const emailRegex: RegExp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

/**
 * Checks if a string is a hashtag (starts with '#').
 */
export const isHashtag = (text: string) => text.startsWith('#');

/**
 * Checks if a string is a mention (starts with '@').
 */
export const isMention = (text: string) => text.startsWith('@');

export const validatePassword = (value: string): boolean => {
    return validatePasswordRegex.test(value);
};

export const validateEmailPhone = (value: string): boolean => {
    if (value == null) {
        return false;
    }

    return emailRegex.test(value) || phoneRegex.test(value);
};

/**
 * Checks if a full name contains at least two words.
 */
export const validateFullName = (value: string): boolean => {
    return value?.trim().split(" ").length > 1;
};

/**
 * Validates a URL string. Empty or undefined is considered valid.
 */
export const validateUrl = (text: string | undefined): boolean => {
    if (text == null || text.length === 0) {
        return true; //No url entered should be considered valid
    }

    try {
        new URL(text);
        return true;
    } catch (e) {
        return false;
    }
}

// Supported video file extensions
const validVideoExtensions: string[] = ["avif", "ogm", "wmv", "mpg", "webm", "ogv", "mov", "asx", "mpeg", "mp4", "m4v", "avi"];
/**
 * Checks if a file path has a valid video extension.
 * @throws Error if the path is invalid.
 */
export const isVideoFileFromPath = (path: string): boolean => {
    if (!path || path.trim().length < 4) {
        throw new Error("Invalid path");
    }

    const ext = path.toLowerCase().substring(path.lastIndexOf(".") + 1);

    return validVideoExtensions.includes(ext);
}

/**
 * Checks if a MIME type string indicates a video.
 * @throws Error if the type is invalid.
 */
export const isVideoFileFromType = (type: string): boolean => {
    if (type == null || type.trim().length < 4) {
        throw new Error("Invalid type");
    }

    return type.toLowerCase().includes("video");
}

/**
 * Converts a base64 string to a File blob object.
 */
export const base64ToBlob = (base64String: string, outFileName: string): File | null => {
    if (base64String === null || base64String.length === 0) {
        return null;
    }

    const contentType = base64String.substring(5, base64String.indexOf(';'));
    const data = base64String.substring(base64String.indexOf(",") + 1);

    return base64ToBlobEx(data, contentType, outFileName);
}

/**
 * Converts a base64 string (without prefix) to a File object.
 */
export const base64ToBlobEx = (base64String: string, contentType: string, outFileName: string): File => {
    const sliceSize = 512;
    const byteCharacters = atob(base64String);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        byteArrays.push(new Uint8Array(byteNumbers));
    }

    return new File(byteArrays, outFileName, { type: contentType });
}

/**
 * Converts a Blob to a base64 string.
 */
export const blobToBase64 = async (blob: any): Promise<string | ArrayBuffer | null> => {
    blob = await createBlob(blob);

    return new Promise((resolve, _reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

/**
 * Fetches a resource as a Blob.
 */
export const createBlob = async (url: string): Promise<Blob | null> => {
    try {
        const response = await fetch(url);
        const data = await response.blob();
        return data;
    } catch (err) {
        console.log(err);
    }
    return null;
}

/**
 * Extracts the MIME type from a base64 data URL.
 */
export const extractMimeTypeFromBase64 = (data: string): string | null => {
    if (data == null || data.length === 0) {
        return null;
    }

    return data.substring(5, data.indexOf(';') + 1);
}

/**
 * Extracts a frame from a video element as a JPEG blob URL.
 */
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

/**
 * Returns a human-readable difference between now and the given date.
 */
export const dateDiff = (dateTime: Date): string => {
    if (dateTime == null) {
        return "now";
    }

    const now = new Date().getTime();
    const dateTimeMilli = new Date(dateTime).getTime();
    const diff = new Date(now - dateTimeMilli);
    let diffMilli = diff.getTime();

    const days = Math.floor(diffMilli / 1000 / 60 / 60 / 24);
    diffMilli = diffMilli - (days * 1000 * 60 * 60 * 24);

    const weeks = Math.floor(days / 7.0);
    const hours = Math.floor(diffMilli / 1000 / 60 / 60);
    diffMilli = diffMilli - (hours * 1000 * 60 * 60);
    const mins = Math.floor(diffMilli / 1000 / 60);

    if (weeks >= 1) {
        return weeks + "w";
    }

    if (days >= 1) {
        return days + "d";
    }

    if (hours >= 1) {
        return hours + "h";
    }

    if (mins >= 1) {
        return mins + "m";
    }

    return "now";
}

/**
 * Formats a Date object as a readable string.
 */
export const getDateAsText = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-us', { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Finds a post by ID from a list of posts.
 */
export const getPostFromListById = (postId: string, posts: Post[]): Post => {
    return posts.find(post => post.postId === postId) ?? ({} as any);
}

/**
 * Checks if a post is liked by a given user.
 */
export const isPostLiked = (userName: string, post: Post): boolean => {
    return !!(post?.global?.likes?.some((like: any) => like.userName === userName));
}

/**
 * Toggles the liked state of a post for a user (Only on the front end, no backend call here).
 */
export const togglePostLikedState = (userName: string, userId: string, post: Post): Post => {
    if (post == null || userName == null || userId == null) {
        return post;
    }

    if (post.global.likes == null) {
        post.global.likes = [];
    }

    const index = post.global.likes.findIndex((value: any) => value.userName === userName);
    if (index === -1) {
        // Username is not in the post's like list, so add it
        post.global.likes.push({ userName, userId });
    } else {
        // Remove the username from the post's like list
        post.global.likes.splice(index, 1);
    }

    return post;
}

/**
 * Sanitizes text for safe HTML display and also returns a plain text version.
 */
export const getSanitizedText = (text: string): [string, string] => {
    if (text == null || text.length === 0)
        return [text, text];

    const textHtml = sanitizeHtml(text, {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'sub', 'sup'],
        allowedAttributes: {
            'a': ['href']
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

/**
 * Checks if an element with the given ID is vertically overflowed.
 */
export const isOverflowed = (id: string): boolean => {
    const element = document.getElementById(id);

    if (element == null) {
        return false;
    }

    return element.offsetHeight < element.scrollHeight;
}

/**
 * Follows or unfollows a user by calling the backend service.
 */
export const followUser = async (userId: string, followUserId: string, shouldFollow: boolean): Promise<boolean> => {
    if (userId === followUserId) {
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

/**
 * Returns the profile picture URL from a Profile object, or a default if missing.
 */
export const getPfpFromProfile = (profile: Profile | null): string => {
    return profile?.pfp?.length ? profile.pfp : DEFAULT_PFP;
}

/**
 * Returns the profile picture URL from a Post object, or a default if missing.
 */
export const getPfpFromPost = (post: Post): string => {
    if (post.user.pfp == null || post.user.pfp.length === 0) {
        return DEFAULT_PFP;
    }

    return post.user.pfp;
}

/**
 * Splits a full name into first, middle, and last names.
 */
export const splitFullName = (fullName: string): { firstName: string, middleNames: string, lastName: string } => {
    const names = fullName.trim().split(' ');
    const firstName = names[0];
    const lastName = names[names.length - 1];
    const middleNames = names.slice(1, names.length - 1).join(' ');

    return { firstName, middleNames, lastName };
}

/**
 * Updates fields on a post and calls onClose with the result.
 */
export const updatePostFields = async (post: Post, fieldsToUpdate: { key: string, value: any }[], onClose: (data: any) => void) => {
    if (fieldsToUpdate == null || fieldsToUpdate.length === 0) {
        return;
    }

    try {
        const newPost: Post = await updatePost(post, fieldsToUpdate);
        // Close the modal
        onClose({ isCommited: true, post: newPost, isDeleted: false });
    } catch (err) {
        console.error(err)
    }
}


/**
 * Updates a post with the given fields and returns the updated post.
 */
export const updatePost = async (post: Post, fieldsToUpdate: { key: string, value: any }[]): Promise<Post> => {
    if (fieldsToUpdate == null || fieldsToUpdate.length === 0) {
        return post;
    }

    try {
        // build the query from the given fieldsToUpdate array
        let fields: any = null;
        if (fieldsToUpdate.length > 0) {
            fields = {};
            fieldsToUpdate.forEach((field) => {
                fields[field.key] = field.value;
            });
        }

        // Call the update post service
        const results = await postUpdatePost({ postId: post.postId, fields });
        if (results == null || results.status !== 200) {
            throw new Error("Error updating post");
        }

        // update the local returned post adding the fields not returned by ES
        results.data.postId = post.postId
        results.data.user.pfp = post.user.pfp;
        results.data.commentCount = post.global.commentCount;
        if (post?.global?.likes != null) {
            results.data.global.likes = [...post?.global?.likes];
        }

        return results.data as Post;
    } catch (err) {
        console.error(err)
    }
    return post;
}

/**
 * Stores a search query (string or Profile) in localStorage under "recentSearches".
 * Prevents duplicates based on string value or Profile.profileId.
 * @param value - The search query to store.
 * @returns The updated array of stored queries.
 */
export const storeSearchQueries = (value: string | Profile): (string | Profile)[] => {
    const key: string = "recentSearches";
    try {
        const storedData = localStorage.getItem(key);
        const parsedData = storedData ? JSON.parse(storedData) : [];

        // Check if value is a duplicate
        const isDuplicate: boolean = parsedData.some((item: string | Profile) => {
            if (typeof item === 'string') {
                return item === value;
            } else {
                return item.profileId === (value as Profile).profileId;
            }
        })

        if (isDuplicate) {
            return parsedData;
        }

        parsedData.push(value);

        localStorage.setItem(key, JSON.stringify(parsedData));
        return parsedData;
    } catch (err) {
        console.error(err);
    }
    return [];
}

/**
 * Removes a search query (string or Profile) from localStorage "recentSearches".
 * @param value - The search query to remove.
 * @returns The updated array of stored queries.
 */
export const removeStoredSearchQuery = (value: string | Profile): (string | Profile)[] => {
    const key: string = "recentSearches";
    let queries: (string | Profile)[] = [];
    try {
        queries = getStoredSearchQueries();
        const filteredQueries = queries.filter((item: string | Profile) => {
            if (typeof item === 'string') {
                return item !== value;
            } else {
                return item.profileId !== (value as Profile).profileId;
            }
        });
        localStorage.setItem(key, JSON.stringify(filteredQueries));
        return filteredQueries;
    } catch (err) {
        return queries;
    }
}

/**
 * Retrieves all stored search queries (strings or Profiles) from localStorage.
 * @returns An array of stored queries.
 */
export const getStoredSearchQueries = (): (string | Profile)[] => {
    const key: string = "recentSearches";
    const item = localStorage.getItem(key);

    if (!item) {
        return [];
    }

    try {
        return JSON.parse(item);
    } catch (err) {
        return [];
    }
}

/**
 * Builds a space-separated string of user names from selected Profile objects.
 * @param selectedProfiles - A record of Profile objects keyed by string.
 * @returns A string of user names separated by spaces.
 */
export const buildCollabSearchText = (selectedProfiles: Record<string, Profile>): string => {
    if (!selectedProfiles) {
        return "";
    }

    // Clear out the text input if there's no results
    let userNames: string = "";

    Object.values(selectedProfiles).forEach((profile: Profile) => {
        userNames = `${userNames}${profile.userName} `;
    });

    return userNames.trim();
}