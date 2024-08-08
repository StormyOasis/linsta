import Router from "koa-router";
import { getIsUnqiueUsername, attemptCreateUser, sendConfirmCode, loginUser, forgotPassword, changePassword } from './controllers/accountsController';
import { verifyJWT } from "./auth/Auth";

const router = new Router();

// Account creation handlers
router.get("/api/v1/accounts/check/:userName", getIsUnqiueUsername);
router.post("/api/v1/accounts/attempt", attemptCreateUser);
router.get("/api/v1/accounts/send_confirm_code", sendConfirmCode);
router.post("/api/v1/accounts/login", loginUser);
router.post("/api/v1/accounts/forgot", forgotPassword);
router.post("/api/v1/accounts/change_password", changePassword);

router.get("/test", verifyJWT, () => {
    console.log("Inside /test");
})

export default router;