import { Comment } from "../../../../../api/types";
import { postToggleCommentLike } from "../../../../../api/ServiceController";

export type CommentUiData = {
    repliesVisibleFlag: boolean;
    comment: Comment;
    children: any;
    childCount: number;
};

export const isCommentLiked = (userName: string, comment: Comment): boolean => {
    if (comment == null || userName == null) {
        return false;
    }

    const result = comment.likes?.filter((like: any) => like.userName === userName);

    return result && result.length > 0;
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

export const mapCommentsToCommentData = (comments: Comment[], existingComments: any): any => {
    if (comments == null || comments.length === 0) {
        return {};
    }

    const commentMap: Map<string, CommentUiData> = new Map<string, CommentUiData>();
    const rootNodes: CommentUiData[] = [];

    // Store all the comments in a key-value pair by comment id for quick retrieval
    comments.forEach((comment: Comment) => {
        const commentUiData: CommentUiData = {
            repliesVisibleFlag: false,
            comment: comment,
            children: {},
            childCount: 0
        };

        commentUiData.repliesVisibleFlag = 
            existingComments[comment.commentId] == null ? false : existingComments[comment.commentId].repliesVisibleFlag;

        commentMap.set(comment.commentId, commentUiData);
    });

    // Convert the comments into a proper hierarchy
    commentMap.forEach((entry) => {
        if (entry.comment.parentCommentId !== null && commentMap.has(entry.comment.parentCommentId)) {

            // `entry` points to a comment that is a child of another. Add the association to the parent's child array
            
            // Get parent node
            const parent: CommentUiData|undefined = commentMap.get(entry.comment.parentCommentId);
            if(parent == null) {
                console.warn("Invalid parent comment");
            } else {
                // Add the current node as a child to the given parent
                parent.children[entry.comment.commentId] = entry;
                parent.childCount++;
            }            
        } else {
            // `entry` does not have a parent so therefore it is a root node
            rootNodes.push(entry);
        }
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

export const toggleCommentLikedState = (userName: string, userId: string, comment: Comment): (Comment | null) => {
    if (comment == null || userName == null || userId == null) {
        return null;
    }

    const index = comment.likes?.findIndex((value: any) => value.userName === userName);

    if (index === -1) {
        // Username is not in the comments's like list, so add it
        comment.likes.push({ userName, userId });
    } else {
        // Remove the username from the comment's like list
        comment.likes.splice(index, 1);
    }

    return comment;
}