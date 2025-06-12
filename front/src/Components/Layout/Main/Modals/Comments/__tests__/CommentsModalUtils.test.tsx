jest.mock("../../../../../../api/ServiceController", () => ({
    postToggleCommentLike: jest.fn(),
}));

import {
    isCommentLiked,
    searchCommentsById,
    mapCommentsToCommentData,
    toggleCommentReplyUiData,
    toggleCommentLike,
    toggleCommentLikedState,
    CommentUiData,
} from "../CommentsModalUtils";
import '@testing-library/jest-dom';

describe("CommentsModalUtils", () => {
    describe("isCommentLiked", () => {
        it("returns false if comment or userName or likes is null", () => {
            expect(isCommentLiked("user", null)).toBe(false);
            expect(isCommentLiked(null as any, { likes: [] } as any)).toBe(false);
            expect(isCommentLiked("user", { likes: null } as any)).toBe(false);
        });
        it("returns true if userName is in likes", () => {
            const comment = { likes: [{ userName: "bob" }, { userName: "alice" }] } as any;
            expect(isCommentLiked("alice", comment)).toBe(true);
            expect(isCommentLiked("notfound", comment)).toBe(false);
        });
    });

    describe("searchCommentsById", () => {
        const commentA: CommentUiData = {
            repliesVisibleFlag: false,
            comment: { commentId: "a", parentCommentId: null, likes: [] } as any,
            children: {},
            childCount: 0,
        };
        const commentB: CommentUiData = {
            repliesVisibleFlag: false,
            comment: { commentId: "b", parentCommentId: "a", likes: [] } as any,
            children: {},
            childCount: 0,
        };
        beforeEach(() => {
            commentA.children = { b: commentB };
            commentA.childCount = 1;
        });

        it("finds root comment by id", () => {
            const comments = { a: commentA };
            expect(searchCommentsById("a", comments)).toBe(commentA);
        });
        it("finds child comment by id", () => {
            const comments = { a: commentA };
            expect(searchCommentsById("b", comments)).toBe(commentB);
        });
        it("returns null if not found", () => {
            const comments = { a: commentA };
            expect(searchCommentsById("c", comments)).toBeNull();
        });
        it("returns null if comments or commentId is null", () => {
            expect(searchCommentsById(null as any, null)).toBeNull();
        });
    });

    describe("mapCommentsToCommentData", () => {
        it("returns empty object for null or empty input", () => {
            expect(mapCommentsToCommentData(null as any, {})).toEqual({});
            expect(mapCommentsToCommentData([], {})).toEqual({});
        });
        it("maps flat comments to root nodes", () => {
            const comments = [
                { commentId: "a", parentCommentId: null, likes: [] },
                { commentId: "b", parentCommentId: null, likes: [] },
            ] as any[];
            const result = mapCommentsToCommentData(comments, {});
            expect(Object.keys(result)).toEqual(["a", "b"]);
        });
        it("maps child comments under parents", () => {
            const comments = [
                { commentId: "a", parentCommentId: null, likes: [] },
                { commentId: "b", parentCommentId: "a", likes: [] },
            ] as any[];
            const result = mapCommentsToCommentData(comments, {});
            expect(result.a.children.b.comment.commentId).toBe("b");
            expect(result.a.childCount).toBe(1);
        });
    });

    describe("toggleCommentReplyUiData", () => {
        it("toggles repliesVisibleFlag for the given comment", () => {
            const comment: CommentUiData = {
                repliesVisibleFlag: false,
                comment: { commentId: "a", parentCommentId: null, likes: [] } as any,
                children: {},
                childCount: 0,
            };
            const comments = [comment];
            const updated = toggleCommentReplyUiData(comment, comments);
            expect(updated[0].repliesVisibleFlag).toBe(true);
        });
        it("returns empty array if commentList is empty", () => {
            expect(toggleCommentReplyUiData({} as any, [])).toEqual([]);
        });
    });

    describe("toggleCommentLikedState", () => {
        it("adds like if not present", () => {
            const comment = { likes: [] } as any;
            const updated = toggleCommentLikedState("alice", "1", comment);
            expect(updated.likes).toEqual([{ userName: "alice", userId: "1" }]);
        });
        it("removes like if present", () => {
            const comment = { likes: [{ userName: "alice", userId: "1" }] } as any;
            const updated = toggleCommentLikedState("alice", "1", comment);
            expect(updated.likes).toEqual([]);
        });
        it("returns null if comment or userName or userId is null", () => {
            expect(toggleCommentLikedState(null as any, "1", {} as any)).toBeNull();
            expect(toggleCommentLikedState("alice", null as any, {} as any)).toBeNull();
            expect(toggleCommentLikedState("alice", "1", null as any)).toBeNull();
        });
    });

    describe("toggleCommentLike", () => {
        it("calls setComments with updated comments if status is 200", async () => {
            const comment: CommentUiData = {
                repliesVisibleFlag: false,
                comment: { commentId: "a", parentCommentId: null, likes: [] } as any,
                children: {},
                childCount: 0,
            };
            const comments = [comment];
            const setComments = jest.fn();
            // Mock postToggleCommentLike and toggleCommentLikedState
            const api = require("../../../../../../api/ServiceController");
            api.postToggleCommentLike.mockResolvedValue({ status: 200 });
            const utils = require("../CommentsModalUtils");
            utils.toggleCommentLikedState = jest.fn(() => ({ commentId: "a", likes: [{ userName: "alice", userId: "1" }] }));
            await toggleCommentLike("a", "alice", "1", comments, setComments);
            expect(setComments).toHaveBeenCalled();
        });
        it("does not call setComments if status is not 200", async () => {
            const comment: CommentUiData = {
                repliesVisibleFlag: false,
                comment: { commentId: "a", parentCommentId: null, likes: [] } as any,
                children: {},
                childCount: 0,
            };
            const comments = [comment];
            const setComments = jest.fn();
            const api = require("../../../../../../api/ServiceController");
            api.postToggleCommentLike.mockResolvedValue({ status: 400 });
            await toggleCommentLike("a", "alice", "1", comments, setComments);
            expect(setComments).not.toHaveBeenCalled();
        });
        it("does not call setComments if comment is null", async () => {
            const comments = [];
            const setComments = jest.fn();
            const api = require("../../../../../../api/ServiceController");
            api.postToggleCommentLike.mockResolvedValue({ status: 200 });
            await toggleCommentLike("a", "alice", "1", comments, setComments);
            expect(setComments).not.toHaveBeenCalled();
        });
    });
});