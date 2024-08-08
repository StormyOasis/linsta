import { Context } from "koa";
import bcrypt from 'bcrypt';
import DBConnector from "../Connectors/DBConnector";
import moment from "moment";
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";
import { isEmail, isPhone, isValidPassword, obfuscateEmail, obfuscatePhone } from "../utils/utils";
import config from 'config';
import jwt from 'jsonwebtoken';
import { SEND_CONFIRM_TEMPLATE, FORGOT_PASSWORD_TEMPLATE, sendEmailByTemplate, sendSMS } from "../Connectors/AWSConnector";

export const getIsUnqiueUsername = async (ctx: Context) => {
    Metrics.increment("accounts.checkunique");

    const userName = ctx.params.userName;

    // Error out if invalid data
    if (userName == null || userName.trim().length == 0) {
        ctx.status = 400;
        return;
    }

    //sanatize input 
    const regex = /^[A-Za-z0-9]+$/;
    if (!regex.test(userName)) {
        ctx.status = 400;
        return;
    }

    // Check against the db for username existence

    try {
        const query = "SELECT userName from Users where USERNAME = ?";
        const result = await DBConnector.query(query, [userName]);
        if (result == null) {
            throw new Error();
        }

        if (result != null && (result as []).length != 0) {
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
    dryRun: boolean;
    emailOrPhone: string;
    fullName: string;
    userName: string;
    password: string;
    confirmCode?: string;
    month?: number;
    day?: number;
    year?: number;    
}

export const attemptCreateUser = async (ctx: Context) => {
    Metrics.increment("accounts.attempt");

    const data = <AttemptRequest>ctx.request.body;
    let res = null;

    if (!data.emailOrPhone ||
        !data.fullName ||
        !data.userName ||
        !data.password) {
        ctx.status = 400;
        ctx.body = `{status: "Invalid input"}`;
        return;
    }

    if (!data.dryRun && 
        (data.confirmCode == null || data.day == null || 
        data.month == null || data.year == null)) {
            
        ctx.status = 400;
        ctx.body = `{status: "Invalid input"}`;
        return;
    }
    
    // Determine if value passed to emailOrPhone is an email address or phone
    const isEmailAddr: boolean = isEmail(data.emailOrPhone);
    const isPhoneNum: boolean = isPhone(data.emailOrPhone);

    //Make sure there isn't any invalid email/phone
    if (!isPhoneNum && !isEmailAddr) {
        ctx.body = `{status: "Invalid email and phone"}`;
        ctx.status = 400;
        return;
    }

    //strip out first name into component parts
    const names: string[] = data.fullName.trim().split(' ');
    if (names.length == 0) {
        ctx.status = 400;
        ctx.body = `{status: "Invalid full name"}`;
        return;
    }

    if (!data.dryRun) {
        // If this is not a dry run an instead an actual attempt then 
        // we need to compare the confirmation codes
        if(data.confirmCode?.trim().length !== 8 || data.emailOrPhone.trim().length === 0) {
            ctx.status = 400;
            ctx.body = `{status: "Invalid Confirmation Code"}`;
            return;
        }

        // Check if confirmation code + email/phone entry exists
        res = await DBConnector.query("SELECT * FROM ConfirmCodes where user_data = ? and code = ?", [data.emailOrPhone.trim(), data.confirmCode.trim()])
            .then(r => res = r)
            .catch(() => {
                ctx.status = 500;
                return;
            });

            if (res == null || (res as []).length == 0) {
                // no matching code found so respond as invalid
                ctx.status = 400;
                ctx.body = `{status: "Invalid Confirmation Code"}`;
                return;
            }
    }

    let failureOccured:boolean = false;

    if(!isValidPassword(data.password)) {
        // Password does not pass rules check
        ctx.status = 400;
        ctx.body = `{status: "Invalid Password"}`;
        return;        
    }

    try {        
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const first: string = names[0];
        const last: string = names.length > 1 ? names[names.length - 1] : "";
        const currentTime = moment();
        const timestamp = currentTime.format("YYYY-MM-DD  HH:mm:ss.000");
        const birthDate = data.dryRun ? currentTime : moment(
            {
                year: data.year, 
                month: data.month, 
                day: data.day,
                hour: currentTime.hour(),
                minute: currentTime.minute(),
                second: currentTime.second(),
                millisecond: currentTime.millisecond()
            });
        const age = data.dryRun ? 0 : currentTime.diff(birthDate, 'years', true);

        // use transaction to do wither a dry run or an actual insert
        await DBConnector.query("START TRANSACTION", []);
        res = await DBConnector.execute(
            `INSERT INTO Users VALUES(?,?,?,?,?,?,?,?,?,?)`, [
            first, last, "0", `${age}`,
            isEmailAddr ? data.emailOrPhone : '',
            isPhoneNum ? data.emailOrPhone : '',
            data.userName,
            birthDate.format("YYYY-MM-DD  HH:mm:ss.000"),
            timestamp,
            hashedPassword
        ]);

        if (!res) {        
            ctx.status = 400;
            ctx.body = `{status: "Error adding user"}`;
            failureOccured = true;
        } else {
            if(!data.dryRun && data.confirmCode) {
                res = await DBConnector.query("DELETE FROM ConfirmCodes WHERE USER_DATA = ? AND CODE = ?", 
                    [data.emailOrPhone, data.confirmCode]);

                if(!res) {
                    ctx.status = 400;
                    ctx.body = `{status: "Error with confirmation code"}`;    
                    failureOccured = true;            
                }
            }
        }

    } catch (err) {
        ctx.status = 500;
        failureOccured = true;
    }

    if(data.dryRun || failureOccured) {
        await DBConnector.query("ROLLBACK", [])
            .then(() => {ctx.body = `{"status": ${failureOccured ? "Error creating user" : "OK"}}`;})
            .catch(err => {
                logger.error(`Error Rolling back: ${err}`);
                ctx.status = 400;
                ctx.body = `{"status": "Error creating user"}`;
            });
    } else {
        await DBConnector.query("COMMIT", [])
            .then(() => {ctx.body = `{"status": "OK"}`;})
            .catch(err => {
                logger.error(`Error Commiting transaction: ${err}`);
                ctx.status = 400;
                ctx.body = `{"status": "Error creating user"}`;
            });
    }
}

type SendCodeRequest = {
    user: string
}

export const sendConfirmCode = async (ctx: Context) => {
    Metrics.increment("accounts.sendcode");

    const req = <SendCodeRequest>ctx.request.query;
    const userData = req.user?.trim();

    if (!userData || userData.length < 3) {
        ctx.status = 400;
        return;
    }

    // Determine if value passed an email address or phone num
    const isEmailAddr: boolean = isEmail(userData);
    const isPhoneNum: boolean = isPhone(userData);

    //Make sure there isn't any invalid email/phone
    if (!isPhoneNum && !isEmailAddr) {
        ctx.response.res.statusCode = 400;
        return;
    }

    let res = null;
    const currentTime = moment();    
    
    // generate a token to be used in the and store in the db
    const token: string = crypto.randomUUID().split("-")[0]; 
    
    await DBConnector.query("SELECT * FROM ConfirmCodes where user_data = ?", [userData])
        .then(r => res = r)
        .catch(err => { 
            logger.error("DB error: ", err);
            Metrics.increment("db.error.counts"); 
            ctx.status = 500;
        });

    if (res == null || res[0] == null || (res[0] as []).length == 0) {
        // Doesn't exist in the db
        // so we will assume this is a brand new attempt
        res = await DBConnector.query("INSERT INTO ConfirmCodes VALUES(?, ?, ?)", 
            [token, userData, currentTime.format("YYYY-MM-DD  HH:mm:ss.000")])
            .catch(err => { 
                logger.error("DB error: ", err); 
                Metrics.increment("db.error.counts"); 
                ctx.status = 500;
            });
    } else {
        // an entry currently exists, replace it with the new code
        await DBConnector.query("UPDATE ConfirmCodes SET CODE = ?, SENT_TIME = ? where USER_DATA = ?", 
            [token, currentTime.format("YYYY-MM-DD  HH:mm:ss.000"), userData])
            .catch(err => { 
                logger.error("DB error: ", err); 
                Metrics.increment("db.error.counts"); 
                ctx.status = 200;
            });
    }

    if(ctx.status != 500) {
        if(isEmailAddr) {
            // Send email
            const replyToAddress:string = config.get("aws.ses.defaultReplyAddress");

            try {
                await sendEmailByTemplate(SEND_CONFIRM_TEMPLATE, {
                    destination: {ToAddresses: [userData]},
                    source: replyToAddress,
                    template: SEND_CONFIRM_TEMPLATE,
                    templateData: {
                        assetHostname: config.get("aws.ses.imageHostName"),
                        emailAddress: userData,
                        code: token
                    }
                });
                ctx.body = "OK";
            } catch(err) {
                ctx.body = "Send Error";
            }
        } else {
            // Send SMS
            await sendSMS(userData, token);
        }

        ctx.status = 200;        
    }
}

type LoginRequest = {
    userName: string;
    password: string;
}

export const loginUser = async (ctx: Context) => {
    Metrics.increment("accounts.userlogin");
    
    const data = <LoginRequest>ctx.request.body;

    if(data.userName == null || data.password == null) {
        ctx.status = 400;
        ctx.body = {status: "Invalid username or password"};
        return;
    }

    // Check against the db for username existence

    try {
        const query = "SELECT userName, password, id from Users where USERNAME = ?";
        const result = await DBConnector.execute(query, [data.userName]);
        if (result == null) {
            logger.error("Invalid query");
            throw new Error();
        }

        if (result != null && (result as []).length != 0) {
            const dbData = (result as []).at(0);
            if(dbData) {                
                const passwordMatch:boolean = await bcrypt.compare(data.password, dbData['password']);
                if(passwordMatch) {
                    // create the JWT token
                    const token = jwt.sign(
                        {id: (dbData['id'] as string)}, 
                        config.get("auth.jwt.secret") as string,
                        {
                            algorithm: 'HS256',
                            allowInsecureKeySizes: true,
                            expiresIn: config.get("auth.jwt.expiration")
                        }                        
                    );                    

                    ctx.status = 200;
                    ctx.body = {token: token, userName: data.userName, id: dbData['id']};                    
                } else {
                    ctx.status = 400;
                    ctx.body = {status: "Invalid username or password"};                    
                }
            }
        } else {
            ctx.status = 400;
            ctx.body = {status: "Invalid username or password"};
            return;            
        }

    } catch (err) {
        Metrics.increment("db.error.counts");
        ctx.status = 400;
        return;
    }    
}

type ForgotRequest = {
    user: string;
}

export const forgotPassword = async (ctx: Context) => {
    Metrics.increment("accounts.forgot");

    const data = <ForgotRequest>ctx.request.body;

    if(data.user == null) {
        ctx.status = 400;
        ctx.body = {status: "Invalid user info"};
        return;
    }

    try {
        const query = "SELECT EMAIL, PHONE, USERNAME, ID from Users where EMAIL = ? OR PHONE = ? OR USERNAME = ?";
        const result = await DBConnector.execute(query, [data.user, data.user, data.user]);
        if (result == null) {            
            throw new Error();
        }

        if (result != null && (result as []).length != 0) {
            const dbData = (result as []).at(0);
            
            if(dbData) {
                const email = (dbData['EMAIL'] as string);
                const phone = (dbData['PHONE'] as string);
                const userName = (dbData['USERNAME'] as string);
                const userId = (dbData['ID'] as string);

                await sendForgotMessage(ctx, email, phone, userName, userId);
            } else {
                ctx.status = 400;
                ctx.body = {status: "Invalid user info"};                
                return;                
            }
        }

    } catch(err) {
        logger.error(err);
        Metrics.increment("db.error.counts");
        ctx.status = 400;
        ctx.body = {status: "Invalid user info"};
        return;        
    }    
}

const sendForgotMessage = async (ctx: Context, email: string, phone: string, userName: string, userId: string) => {
    if((email == null && phone == null) || userName == null) {
        return false;
    }

    // Generate a unique token and store it in the db mapped to the user
    const token: string = crypto.randomUUID().replace(/-/g, ""); 

    try {
        const res = await DBConnector.execute(`
            INSERT INTO ForgotToken VALUES(?, ?) 
            ON DUPLICATE KEY UPDATE token = ?`,  
            [token, userId, token]);

        if(res == null) {
            throw new Error();
        }

        if(email.length > 0) {
            // Send forgot message as an email to user
            const replyToAddress:string = config.get("aws.ses.defaultReplyAddress");

            try {
                const r = await sendEmailByTemplate(FORGOT_PASSWORD_TEMPLATE, {
                    destination: {ToAddresses: [email]},
                    source: replyToAddress,
                    template: FORGOT_PASSWORD_TEMPLATE,
                    templateData: {
                        assetHostname: config.get("aws.ses.imageHostName"),
                        hostname: config.get("frontHost"),
                        emailAddress: email,
                        token: token,
                        username: userName,                 
                    }
                });

                if(r) {
                    ctx.status = 200;
                    ctx.body = {status: "OK", title: "Email Sent", 
                        text: `We sent an email to ${obfuscateEmail(email)} with a link to reset your password`};
                } else {
                    ctx.status = 400;
                    ctx.body = {status: "Failed to send message"};
                }
            } catch(err) {
                logger.error("Error sending forgot password message", err);
                return false;
            }
        } else {
            // TODO: SMS messaging

            //Send forgot message as an SMS to user
            const message = `A request to reset your Linstagram password was made`
            const r = await sendSMS(phone, message);

            if(r) {
                ctx.status = 200;
                ctx.body = {status: "OK", title: "SMS Sent", 
                    text: `A request to reset your Linstagram password was made. Use this link to reset your password ${obfuscatePhone(phone)}`};
            } else {
                ctx.status = 400;
                ctx.body = {status: "Failed to send message"};
            }            
        }

        return true;
    } catch(err) {
        logger.error("DB error: ", err); 
        Metrics.increment("db.error.counts"); 
        return false;
    }
}

type ChangePasswodType = {
    token?:string;
    userName?:string;
    oldPassword?: string;
    password1: string;
    password2: string;
}
export const changePassword = async (ctx: Context) => {
    Metrics.increment("accounts.changePassword");

    const data = <ChangePasswodType>ctx.request.body;

    if(data.password1 !== data.password2) {
        ctx.status = 400;
        ctx.body = {status: "Passwords don't match"};
        return;
    }

    if(!isValidPassword(data.password1)) {
        // Password does not pass rules check
        ctx.status = 400;
        ctx.body = `{status: "Invalid Password"}`;
        return;        
    }    

    if(data.token == null && (data.userName == null || data.oldPassword == null)) {
        ctx.status = 400;
        ctx.body = {status: "Invalid username, password, or token"};
        return;        
    }

    const hashedPassword = await bcrypt.hash(data.password1, 10);    

    try {
        if (data.userName != null) {
            if(data.oldPassword == null) {
                ctx.status = 400;
                ctx.body = {status: "Invalid username, password, or token"};               
                return;                      
            }
            const hashedOldPassword = await bcrypt.hash(data.oldPassword, 10);

            // Use the username and password to change password        
            const result = await DBConnector.execute("UPDATE User SET PASSWORD = ? where USERNAME = ? AND PASSWORD = ?",
                [hashedPassword, data.userName, hashedOldPassword]);

            if (result == null) {
                throw new Error();
            }

        } else {
            // use the token to change password and then delete the token from the db
            await DBConnector.query("START TRANSACTION", []);
            const token:string = data.token ? data.token : "";

            let result = await DBConnector.execute(`
                SELECT USERNAME, ID from Users 
                INNER JOIN ForgotToken
                ON Users.ID = ForgotToken.USER_ID
                WHERE ForgotToken.TOKEN = ?`, [token]);

            if(result == null || (result as []).length == 0) {
                throw new Error();
            }

            if (result != null && (result as []).length != 0) {
                const dbData = (result as []).at(0);
                
                if(dbData) {
                    const userName = `${dbData["USERNAME"]}`;
                    const userId = `${dbData["ID"]}`

                    result = await DBConnector.execute("UPDATE Users SET PASSWORD = ? where USERNAME = ?",
                        [hashedPassword, userName]);

                    if (result == null) {                
                        throw new Error();
                    }
                    
                    result = await DBConnector.execute("DELETE FROM ForgotToken where USER_ID = ?", [userId]);
                    if (result == null) {                
                        throw new Error();
                    }                    
                }
            }
            if (result == null) {                
                throw new Error();
            }

            await DBConnector.execute("COMMIT", []);
        }
    } catch (err) {
        await DBConnector.execute("ROLLBACK", []);

        ctx.status = 500;
        ctx.body = { status: "DB error" };
        return;
    }

    ctx.status = 200;
    ctx.body = {status: "OK"};
}