export type HistoryType = {
    navigate: any;
    location: any;
    isServer: boolean;
};

export type User = {
    userName: string;
    userId: string;
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
};

export type Comment = {
    dateTime: Date;
    comment: string;
    user: User;
    comments: Comment[];
};

export type Post = {
    user: User;
    global: {
        id: string;
        dateTime: Date;
        captionText: string;
        commentsDisabled: boolean;
        likesDisabled: boolean;
        locationText: string;
        likes: Like[];
        comments: Comment[];
    },
    media: Media[];
};