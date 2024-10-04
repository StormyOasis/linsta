export type HistoryType = {
    navigate: any,
    location: any,
    isServer: boolean
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

export type Post = {
    user: {
        userName: string;
        userId: string;
    },
    global: {
        id: string;
        dateTime: Date;
        captionText: string;
        commentsDisabled: boolean;
        likesDisabled: boolean;
        locationText: string;
        likes: Like[];
    },
    media: Media[];
};