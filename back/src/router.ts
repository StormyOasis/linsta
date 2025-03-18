import Router from "koa-router";
import {
    getIsUnqiueUsername,
    attemptCreateUser,
    sendConfirmCode,
    loginUser,
    forgotPassword,
    changePassword,
    toggleFollowing
} from './controllers/accountsController';
import { verifyJWT } from "./auth/Auth";
import { getLocation } from "./controllers/locationsController";
import { addPost, getAllLikesByPost, getAllPosts, getPostById, postIsPostLikedByUserId, toggleLikePost } from "./controllers/postsController";
import { addComment, getCommentsByPostId, toggleCommentLike } from "./controllers/commentsController";
import {
    bulkGetProfilesAndFollowing, getFollowersByUserId, getFollowingByUserId, getMediaByUserId, getPostProfileByUserId, getPostProfileByUserName,
    getProfileStatsById, putProfilePfp, updateProfileByUserId
} from "./controllers/profilesController";


const router = new Router();

// Account creation handlers
router.get("/api/v1/accounts/check/:userName", getIsUnqiueUsername);
router.get("/api/v1/accounts/send_confirm_code", sendConfirmCode);
router.post("/api/v1/accounts/attempt", attemptCreateUser);
router.post("/api/v1/accounts/login", loginUser);
router.post("/api/v1/accounts/forgot", forgotPassword);
router.post("/api/v1/accounts/change_password", changePassword);
router.post("/api/v1/accounts/follow", verifyJWT, toggleFollowing);

// location handlers
router.get("/api/v1/locations/get", verifyJWT, getLocation);

// posts handlers
router.put("/api/v1/posts/addPost", verifyJWT, addPost);
router.get("/api/v1/posts/getAll", verifyJWT, getAllPosts);
router.get("/api/v1/posts/getPostById", verifyJWT, getPostById);
router.post("/api/v1/posts/likePost", verifyJWT, toggleLikePost);
router.post("/api/v1/posts/isPostLikedByUser", verifyJWT, postIsPostLikedByUserId);
router.get("/api/v1/posts/getAllLikesByPost", verifyJWT, getAllLikesByPost);

// comment handlers
router.post("/api/v1/comment/add", verifyJWT, addComment);
router.post("/api/v1/comment/getByPostId", verifyJWT, getCommentsByPostId);
router.post("/api/v1/comment/toggleLike", verifyJWT, toggleCommentLike);

// Profile handlers
router.post("/api/v1/profiles/update", verifyJWT, updateProfileByUserId);
router.post("/api/v1/profiles/getByUserId", verifyJWT, getPostProfileByUserId);
router.post("/api/v1/profiles/getFollowersByUserId", verifyJWT, getFollowersByUserId);
router.post("/api/v1/profiles/getFollowingByUserId", verifyJWT, getFollowingByUserId);
router.post("/api/v1/profiles/getByUserName", verifyJWT, getPostProfileByUserName);
router.post("/api/v1/profiles/getStatsById", verifyJWT, getProfileStatsById);
router.post("/api/v1/profiles/bulkGetProfiles", verifyJWT, bulkGetProfilesAndFollowing);
router.put("/api/v1/profiles/updatePfp", verifyJWT, putProfilePfp);
router.post("/api/v1/profiles/getMediaByUserId", verifyJWT, getMediaByUserId);

export default router;