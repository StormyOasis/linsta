export type HistoryType = {
    navigate: any;
    location: any;
    isServer: boolean;
};

export type User = {
    userName: string;
    userId: string;
    pfp: string;
};

export type Media = {
    altText: string;
    id: string;
    mimeType: string;
    path: string;
};

export type Like = {
    userName: string;
    userId: string;
    profileId?: string;
    firstName?: string;
    lastName?: string;
    pfp?: string|null;
};

export type Comment = {
    commentId: string;
    dateTime: Date;
    text: string;
    user: User;
    postId: string;
    parentCommentId: string | null;
    likes: Like[];
};

export interface Post {
    postId: string;
    user: User;
    global: {
        id: string;
        dateTime: Date;
        captionText: string;
        commentsDisabled: boolean;
        commentCount: number;
        likesDisabled: boolean;
        locationText: string;
        likes: Like[];
    },
    media: Media[];
}

export type Profile = {
    profileId: string;
    bio?: string;
    pfp: string|null;
    userId: string;
    userName: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    pronouns?: string;
    link?: string;
};

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

export interface PaginationResponse {    
    done: boolean;
    postCursor: any[];
    profileCursor: any[];
    q: string;    
}

export interface PostPaginationResponse extends PaginationResponse {
    dateTime: string;
    postId: string;    
    posts: PostWithCommentCount[];
}

export interface ProfilePaginationResponse extends PaginationResponse {

}