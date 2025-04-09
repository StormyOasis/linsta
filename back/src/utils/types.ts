export type User = {
    userName: string;
    userId: string;
    pfp?: string;
};

export type Like = {
    userName: string;
    userId: string;
    profileId?: string;
    firstName?: string;
    lastName?: string;
    pfp?: string|null;
};

export type Global = {
    id: string;
    dateTime: string;
    captionText: string;
    commentsDisabled: boolean;
    likesDisabled: boolean;
    locationText: string;
    likes: Like[];
};

export type Entry = {
    id: string;
    alt: string;
    entityTag: string;
    url: string;
    userId: string;
    postId: string;
    mimeType: string|null;
};

export interface Post {
    postId: string;
    user:User;
    global:Global;
    media:Entry[];
}

export type Comment = {
    commentId: string;
    dateTime: string;
    text: string;
    user: User;
    postId: string;
    parentCommentId: string | null;
    likes: Like[];
};

export interface Profile {
    profileId: string;
    bio?: string;
    pfp?: string;
    userId: string;
    userName: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    pronouns?: string;
    link?: string;
}

export interface ProfileWithFollowStatus extends Profile {
    isFollowed: boolean;
    followers?: ProfileWithFollowStatus[];   
}

export interface ProfileWithFollowStatusInt {
    [key: string]: ProfileWithFollowStatus;
}        

export interface PostWithCommentCount extends Post {
    commentCount: number;
}