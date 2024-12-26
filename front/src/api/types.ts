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
    commentId: string;
    dateTime: Date;
    text: string;
    user: User;
    postId: string;
    parentCommentId: string | null;
    children: string[];
    likes: Like[];
};

export type Post = {
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
};

export type CommentUiData = {
    repliesVisibleFlag: boolean;
    comment: Comment;
    children: CommentUiData[];
}