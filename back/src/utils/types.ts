export type User = {
    userName: string;
    userId: string;
};

export type Like = {
    userName: string;
    userId: string;
};

export type Global = {
    id: string;
    dateTime: string;
    captionText: string;
    commentsDisabled: boolean;
    commentCount: number;
    likesDisabled: boolean;
    locationText: string;
    likes: Like[];
};

export type Entry = {
    id: string;
    alt: string;
    entityTag: string;
    url: string;
    mimeType: string|null;
};

export type Post = {
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
    children: {        
        commentId: string;
    }[];
    likes: Like[];
};

export type Profile = {
    id: string;
    bio?: string;
    pfp?: string;
    userId: number;
    userName: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    pronouns?: string;
    link?: string;
};