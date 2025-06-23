import Router from "koa-router";
import { verifyJWT } from "../utils";

import { handler as getIsUnqiueUsername } from "../controllers/accounts/checkUserName";
import { handler as sendConfirmCode } from "../controllers/accounts/sendConfirmCode";
import { handler as attemptCreateUser } from "../controllers/accounts/accountsAttempt";
import { handler as loginUser } from "../controllers/accounts/loginUser";
import { handler as forgotPassword } from "../controllers/accounts/forgotPassword";
import { handler as changePassword } from "../controllers/accounts/changePassword";
import { handler as toggleFollowing } from "../controllers/accounts/toggleFollowing";

import { handler as getLocation } from "../controllers/locations/getLocation";

import { handler as getAllLikesByPost } from "../controllers/posts/getAllLikesByPost";
import { handler as getAllPostsByFollowing } from "../controllers/posts/getAllPostsByFollowing";
import { handler as postGetPostById } from "../controllers/posts/postGetPostById";
import { handler as toggleLikePost } from "../controllers/posts/toggleLikePost";
import { handler as postIsPostLikedByUserId } from "../controllers/posts/postIsPostLikedByUserId";
import { handler as getPostsByUserId } from "../controllers/posts/getPostsByUserId";

import { handler as getCommentsByPostId } from "../controllers/comments/getCommentsByPostId";
import { handler as toggleCommentLike } from "../controllers/comments/toggleCommentLike";

import { handler as getPostProfileByUserId } from "../controllers/profiles/getPostProfileByUserId";
import { handler as getFollowersByUserId } from "../controllers/profiles/getFollowersByUserId";
import { handler as getFollowingByUserId } from "../controllers/profiles/getFollowingByUserId";
import { handler as getPostProfileByUserName } from "../controllers/profiles/getPostProfileByUserName";
import { handler as getProfileStatsById } from "../controllers/profiles/getProfileStatsById";
import { handler as bulkGetProfilesAndFollowing } from "../controllers/profiles/bulkGetProfilesAndFollowing";
import { handler as getSingleFollowStatus } from "../controllers/profiles/getSingleFollowStatus";

import { handler as getPostSearch } from "../controllers/search/getPostSearch";
import { handler as getSuggestions } from "../controllers/search/getSuggestions";


const router = new Router();

// Account creation handlers
router.get("/api/v1/accounts/check/:userName", getIsUnqiueUsername);
router.get("/api/v1/accounts/sendConfirmCode", sendConfirmCode);
router.post("/api/v1/accounts/attempt", attemptCreateUser);
router.post("/api/v1/accounts/login", loginUser);
router.post("/api/v1/accounts/forgot", forgotPassword);
router.post("/api/v1/accounts/changePassword", changePassword);
router.post("/api/v1/accounts/follow", verifyJWT, toggleFollowing);

// location handlers
router.get("/api/v1/locations/get", verifyJWT, getLocation);

// posts handlers
router.post("/api/v1/posts/getAllPostsByFollowing", verifyJWT, getAllPostsByFollowing);
router.post("/api/v1/posts/getPostById", verifyJWT, postGetPostById);
router.post("/api/v1/posts/likePost", verifyJWT, toggleLikePost);
router.post("/api/v1/posts/isPostLikedByUser", verifyJWT, postIsPostLikedByUserId);
router.get("/api/v1/posts/getAllLikesByPost", verifyJWT, getAllLikesByPost);
router.post("/api/v1/posts/getByUserId", verifyJWT, getPostsByUserId);

// comment handlers
router.post("/api/v1/comment/getByPostId", verifyJWT, getCommentsByPostId);
router.post("/api/v1/comment/toggleLike", verifyJWT, toggleCommentLike);

// Profile handlers
router.post("/api/v1/profiles/getByUserId", verifyJWT, getPostProfileByUserId);
router.post("/api/v1/profiles/getFollowersByUserId", verifyJWT, getFollowersByUserId);
router.post("/api/v1/profiles/getFollowingByUserId", verifyJWT, getFollowingByUserId);
router.post("/api/v1/profiles/getByUserName", verifyJWT, getPostProfileByUserName);
router.post("/api/v1/profiles/getStatsById", verifyJWT, getProfileStatsById);
router.post("/api/v1/profiles/bulkGetProfiles", verifyJWT, bulkGetProfilesAndFollowing);
router.post("/api/v1/profiles/getSingleFollowStatus", verifyJWT, getSingleFollowStatus);

// Search handlers
router.post("/api/v1/search/search", getPostSearch);
router.get("/api/v1/search/suggest", getSuggestions);

export default router;