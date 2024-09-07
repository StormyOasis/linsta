import Router from "koa-router";
import { 
    getIsUnqiueUsername, 
    attemptCreateUser, 
    sendConfirmCode, 
    loginUser, 
    forgotPassword, 
    changePassword 
} from './controllers/accountsController';
import { verifyJWT } from "./auth/Auth";
import { getLocation } from "./controllers/locationsController";


const router = new Router();

// Account creation handlers
router.get("/api/v1/accounts/check/:userName", getIsUnqiueUsername);
router.post("/api/v1/accounts/attempt", attemptCreateUser);
router.get("/api/v1/accounts/send_confirm_code", sendConfirmCode);
router.post("/api/v1/accounts/login", loginUser);
router.post("/api/v1/accounts/forgot", forgotPassword);
router.post("/api/v1/accounts/change_password", changePassword);

// location handlers
router.get("/api/v1/locations/get", verifyJWT, getLocation);

export default router;