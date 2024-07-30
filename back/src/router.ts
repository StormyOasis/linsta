import Router from "koa-router";
import {getIsUnqiueUsername, attemptCreateUser} from './controllers/accountsController';

const router = new Router();

router.get("/accounts/check/:userName", getIsUnqiueUsername);
router.post("/accounts/attempt", attemptCreateUser);

export default router;