import { Context } from "koa";
import { query, validationResult } from "express-validator";
import DBConnector from "../db/DBConnector";
import moment from "moment";
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";

export const getIsUnqiueUsername = async (ctx : Context) => {
    Metrics.increment("accounts.checkunique");

    const userName = ctx.params.userName;

    // Error out if invalid data
    if(userName == null || userName.trim().length == 0) {
        ctx.status = 400;
        return;
    }

    //sanatize input 
    const regex = /^[A-Za-z0-9]+$/;
    if(!regex.test(userName)) {
        ctx.status = 400;
        return;
    }

    // Check against the db for username existence

    try {
        const query = "SELECT userName from Users where USERNAME = ?";
        const result = await DBConnector.query(query, [userName]);
        if(result == null) {            
            throw new Error();
        }

        if(result[0] != null && (result[0] as []).length != 0) {
            // match found
            ctx.body = true;
        } else {
            ctx.body = false;
        }

    } catch (err) {
        Metrics.increment("db.error.counts");
        ctx.status = 400;
        return;
    }    

    ctx.status = 200;    
}

type AttemptRequest = {
    emailOrPhone: string;
    fullName: string;
    userName: string;
    password: string;    
}

export const attemptCreateUser = async (ctx : Context) => {
    Metrics.increment("accounts.attempt");

    const data = <AttemptRequest>ctx.request.body;
    
    if (!data.emailOrPhone ||
		!data.fullName ||
		!data.userName ||
        !data.password) {
            ctx.response.status = 400;
    } else {
        // Determine if value passed to emailOrPhone is an email address or phone
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        const isEmail = emailRegex.test(data.emailOrPhone);
        const isPhone = phoneRegex.test(data.emailOrPhone);

        //Make sure there isn't any invalid email/phone
        if(!isPhone && !isEmail) {
            ctx.response.status = 400;
            return;
        }

        //strip out first name into component parts
        const names: string[] = data.fullName.trim().split(' ');
        if(names.length == 0) {
            ctx.response.status = 400;
            return;
        }
        const first: string = names[0];
        const last: string = names.length > 1 ? names[names.length - 1] : "";
        let res = null;
        let status = "FAIL";
        let dry_run:boolean = false;

        try {
            // use transaction + rollback to do a dry run of the
            // given data.
            await DBConnector.query("START TRANSACTION", []);
            res = await DBConnector.query(
                `INSERT INTO Users VALUES(?,?,?,?,?,?,?,?,?,?)`, [
                first, last, "0", "0", 
                isEmail ? data.emailOrPhone : '', 
                isPhone ? data.emailOrPhone : '', 
                data.userName, 
                moment().format("YYYY-MM-DD  HH:mm:ss.000"), 
                moment().format("YYYY-MM-DD  HH:mm:ss.000"),
                data.password
            ]);

            if(res) {
                status = 'OK';  
                dry_run = true;
                ctx.status = 200;  
            }

        } catch(err) {
            Metrics.increment("db.error.counts");
            ctx.status = 400;
        }
            
        await DBConnector.query("ROLLBACK", []).then(() => {           
        }).catch(err => {
            logger.error(`Error Rolling back: ${err}`);  
            Metrics.increment("db.error.counts");
        }).finally(() => {
            ctx.body = `{"dry_run":${dry_run}, "status":${status}}`;
        });
        
    }
}