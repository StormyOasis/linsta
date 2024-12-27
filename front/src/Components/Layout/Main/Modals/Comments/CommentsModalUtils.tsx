import { Comment } from "../../../../../api/types";
import { postToggleCommentLike } from "../../../../../api/ServiceController";

export type CommentUiData = {
    repliesVisibleFlag: boolean;
    comment: Comment;
    children: CommentUiData[];
};

export const isCommentLiked = (userName: string, comment: Comment):boolean => {
    if(comment == null || userName == null) {
        return false;
    }

    const result = comment.likes.filter((like:any) => like.userName === userName);

    return result.length > 0;
}

export const searchCommentsById = (commentId: string, comments: any): CommentUiData | null => {
    if (commentId === null || comments == null) {
        return null;
    }

    // Check if it's a root comment
    let foundComment: CommentUiData | null = comments[commentId as keyof typeof comments];

    if (foundComment == null) {
        // Not a root comment so we need to check children ids

        // Variation of a DFS tree traversal
        const traverse = (commentId: string, node: CommentUiData): CommentUiData | null => {
            if (node == null) {
                return null;
            }

            if (node.comment.commentId === commentId) {
                return node;
            }

            for (const [, value] of Object.entries(node.children)) {
                foundComment = traverse(commentId, value as CommentUiData);
                if (foundComment != null) {
                    return foundComment;
                }
            }
            return null;
        };

        // Start the DFS (Note: we can have multiple root nodes hence the array/map)
        for (const [, value] of Object.entries(comments)) {
            foundComment = traverse(commentId, value as CommentUiData);
            if (foundComment !== null) {
                break;
            }
        }
    }

    return foundComment;
}

export const mapCommentsToCommentData = (comments: Comment[], existingComments: CommentUiData[]): any => {
    if (comments == null || comments.length === 0) {
        return {};
    }

    const tmpMap: any = {};
    const rootNodes: CommentUiData[] = [];

    // Store all comments in a key-value pairing by commentId for easy retrieval
    comments.forEach((comment: Comment) => {
        const existingComment: CommentUiData | null = existingComments[comment.commentId as keyof typeof existingComments] as CommentUiData;
        const repliesVisibleFlag = existingComment != null ? existingComment.repliesVisibleFlag : false;
        tmpMap[comment.commentId as keyof typeof tmpMap] = { comment, parentCommentId: comment.parentCommentId, children: [], repliesVisibleFlag };
        
        if (comment.parentCommentId === null) {
            rootNodes.push(tmpMap[comment.commentId as keyof typeof tmpMap]);
        }
    });

    // Convert the comments into a proper hierarchy
    comments.forEach((comment: Comment) => {
        comment.children.forEach((child: string) => {
            tmpMap[comment.commentId as keyof typeof tmpMap].children.push(tmpMap[child]);
        }
        )
    });

    // Convert back to key-value pairs
    const finalMap: any = {};
    rootNodes.forEach((entry: CommentUiData) => {
        finalMap[entry.comment.commentId as keyof typeof finalMap] = entry;
    });

    return finalMap;
}

export const toggleCommentReplyUiData = (commentUiData: CommentUiData, commentList: any): any => {
    if (commentList.length === 0) {
        return [];
    }

    // We're going to be using this to update React state so make a copy first
    const newCommentsList = JSON.parse(JSON.stringify(commentList));
    const comment = searchCommentsById(commentUiData.comment.commentId, newCommentsList);

    if (comment != null) {
        comment.repliesVisibleFlag = !comment.repliesVisibleFlag;
    }

    return newCommentsList;
}

export const toggleCommentLike = async (commentId: string, userName: string, userId: string,
    comments: CommentUiData[], setComments: (comments: any) => void) => {

    let result = await postToggleCommentLike({ commentId, userName, userId });
    if (result.status === 200) {
        const newCommentsList: any = JSON.parse(JSON.stringify(comments));

        // update the comment list by updating the comment instance in the comment state array
        const comment: CommentUiData | null = searchCommentsById(commentId, newCommentsList);

        if (comment === null) {
            return;
        }

        // toggle the like flag
        const newComment: Comment | null = toggleCommentLikedState(userName, userId, comment.comment);

        // Update the state
        if (newComment === null) {
            return
        }

        comment.comment = newComment;

        // Update react state
        setComments(newCommentsList);
    }
}

export const toggleCommentLikedState = (userName: string, userId: string, comment: Comment):(Comment|null) => {
    if(comment == null || userName == null || userId == null) {
        return null;
    }

    const index = comment.likes.findIndex((value:any) => value.userName === userName);

    if(index === -1) {
        // Username is not in the comments's like list, so add it
        comment.likes.push({userName, userId});
    } else {
        // Remove the username from the comment's like list
        comment.likes.splice(index, 1);
    }

    return comment;
}