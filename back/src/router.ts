import Router from "koa-router";
import { 
    getIsUnqiueUsername, 
    attemptCreateUser, 
    sendConfirmCode, 
    loginUser, 
    forgotPassword, 
    changePassword,
    toggleFollowing, 
    postBulkGetInfoAndFollowStatus
} from './controllers/accountsController';
import { verifyJWT } from "./auth/Auth";
import { getLocation } from "./controllers/locationsController";
import { addPost, getAllPosts, getPostById, toggleLikePost } from "./controllers/postsController";
import { addComment, getCommentsByPostId, toggleCommentLike } from "./controllers/commentsController";
import { getProfileByUserId, updateProfileById } from "./controllers/profilesController";


const router = new Router();

// Account creation handlers
router.get("/api/v1/accounts/check/:userName", getIsUnqiueUsername);
router.get("/api/v1/accounts/send_confirm_code", sendConfirmCode);
router.post("/api/v1/accounts/attempt", attemptCreateUser);
router.post("/api/v1/accounts/login", loginUser);
router.post("/api/v1/accounts/forgot", forgotPassword);
router.post("/api/v1/accounts/change_password", changePassword);

// Account action handlers
router.post("/api/v1/accounts/follow", verifyJWT, toggleFollowing);
router.post("/api/v1/accounts/bulkGetInfoAndFollowStatus", verifyJWT, postBulkGetInfoAndFollowStatus);

// location handlers
router.get("/api/v1/locations/get", verifyJWT, getLocation);

// posts handlers
router.put("/api/v1/posts/addPost", verifyJWT, addPost);
router.get("/api/v1/posts/getAll", verifyJWT, getAllPosts);
router.get("/api/v1/posts/getPostById", verifyJWT, getPostById);
router.post("/api/v1/posts/likePost", verifyJWT, toggleLikePost);

// comment handlers
router.post("/api/v1/comment/add", verifyJWT, addComment);
router.post("/api/v1/comment/getByPostId", verifyJWT, getCommentsByPostId);
router.post("/api/v1/comment/toggleLike", verifyJWT, toggleCommentLike);

// Profile handlers
router.post("/api/v1/profiles/update", verifyJWT, updateProfileById);
router.post("/api/v1/profiles/getByUserId", verifyJWT, getProfileByUserId);

export default router;