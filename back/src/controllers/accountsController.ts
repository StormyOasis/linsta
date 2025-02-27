import { Context } from "koa";
import bcrypt from 'bcrypt';
import config from 'config';
import jwt, { SignOptions } from 'jsonwebtoken';
import moment, { MomentInput } from "moment";
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";
import DBConnector from "../Connectors/DBConnector";
import { isEmail, isPhone, isValidPassword, obfuscateEmail, obfuscatePhone } from "../utils/utils";
import { SEND_CONFIRM_TEMPLATE, 
         FORGOT_PASSWORD_TEMPLATE, 
         sendEmailByTemplate, sendSMS } from "../Connectors/AWSConnector";
import { insertProfile } from "../Connectors/ESConnector";

export const getIsUnqiueUsername = async (ctx: Context) => {
    Metrics.increment("accounts.checkunique");

    const userName = ctx["params"].userName;

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
        const uniquePropertyMatcher = await DBConnector.getGraph()?.V()
            .hasLabel("User")
            .has("userName", userName)
            .valueMap(true)
            .next();
                
        const isUnique = uniquePropertyMatcher?.value === null;

        ctx.body = isUnique;
        ctx.status = 200;

    } catch (err) {
        console.log(err);
        ctx.status = 400;
        return;
    }
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
        ctx.body = {status: "Invalid input"};
        return;
    }

    if (!data.dryRun &&
        (data.confirmCode == null || data.day == null ||
            data.month == null || data.year == null)) {

        ctx.status = 400;
        ctx.body = {status: "Invalid input"};
        return;
    }

    // Determine if value passed to emailOrPhone is an email address or phone
    const isEmailAddr: boolean = isEmail(data.emailOrPhone);
    const isPhoneNum: boolean = isPhone(data.emailOrPhone);

    //Make sure there isn't any invalid email/phone
    if (!isPhoneNum && !isEmailAddr) {
        ctx.body = {status: "Invalid email and phone"};
        ctx.status = 400;
        return;
    }

    //strip out first name into component parts
    const names: string[] = data.fullName.trim().split(' ');
    if (names.length == 0) {
        ctx.status = 400;
        ctx.body = {status: "Invalid full name"};
        return;
    }

    if (!data.dryRun) {
        // If this is not a dry run and instead an actual attempt then 
        // we need to compare the confirmation codes
        if (data.confirmCode?.trim().length !== 8 || data.emailOrPhone.trim().length === 0) {
            ctx.status = 400;
            ctx.body = {status: "Invalid Confirmation Code"};
            return;
        }

        try {
            // Check if confirmation code + email/phone entry exists
            res = await DBConnector.getGraph()?.V()
                .hasLabel("ConfirmCode")
                .has("userData", data.emailOrPhone.trim())
                .has("token", data.confirmCode.trim())
                .next();

            if (res == null || res.value == null) {
                // no matching code found so respond as invalid
                ctx.status = 400;
                ctx.body = {status: "Invalid Confirmation Code"};
                return;
            }
        } catch (err) {       
            console.log(err);
            ctx.status = 500;
            return;
        }
    }

    if (!isValidPassword(data.password)) {
        // Password does not pass rules check
        ctx.status = 400;
        ctx.body = {status: "Invalid Password"};
        return;
    }
    
    const first: string = names[0];
    const last: string = names.length > 1 ? names[names.length - 1] : "";    
    let userId: string|undefined = undefined;
    let failureOccured: boolean = false;

    try {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const currentTime = moment();
        const timestamp = currentTime.format("YYYY-MM-DD HH:mm:ss.000");
        const momentData:MomentInput = {
            year: data.year,
            month: data.month,
            day: data.day,
            hour: currentTime.hour(),
            minute: currentTime.minute(),
            second: currentTime.second(),
            millisecond: currentTime.millisecond()
        } as MomentInput;
        
        const birthDate = data.dryRun ? currentTime : moment(momentData);
        const email = isEmailAddr ? data.emailOrPhone : "";
        const phone = isPhoneNum ? data.emailOrPhone : "";
        
        DBConnector.beginTransaction();
        
        // Email, phone, and userName properties must all be unique. 
        // Check for any existing users that have the given values
        // Note: Potential race condition here, but I'm not sure how to resolve it in gremlin so
        // if we end up with duplicate values this is probably the cause    
        const __ = DBConnector.__();
        const uniquePropertyMatcher = await DBConnector.getGraph(true)?.V()
            .hasLabel("User")    
            .and(                
                __.has("userName", data.userName),
                __.or(
                    __.and(
                        __.has("email", email), 
                        __.has("email",  DBConnector.P().neq(""))), 
                    __.and(
                        __.has("phone", phone), 
                        __.has("phone",  DBConnector.P().neq(""))))
    
            )    
            .valueMap(true)
            .next(); 

        const isUnique = uniquePropertyMatcher?.value === null;
        if(!isUnique) {
            // An existing entry has been found, we need to error out and eventually rollback
            ctx.status = 400;
            failureOccured = true;            
        } else {
            // Attempt to insert a user vertex
            const result = await DBConnector.getGraph(true)?.addV("User")
                .property("firstName", first)
                .property("lastName", last)
                .property("email", email)
                .property("phone", phone)
                .property("userName", data.userName)
                .property("birthDate", birthDate.format("YYYY-MM-DD HH:mm:ss.000"))
                .property("joinDate", timestamp)
                .property("password", hashedPassword)
                .next();                

            if(result == null || result.value == null) {
                failureOccured = true;
                ctx.status = 400;
            } else {
                userId = result.value.id;

                if (!data.dryRun && data.confirmCode) {
                    // The confirmation code was checked above and succeeded
                    // We now want to delete it from the DB
                    res = await DBConnector.getGraph(true)?.V()
                        .hasLabel("ConfirmCode")
                        .has("userData", data.emailOrPhone.trim())
                        .drop().toList();
                }
            }
        }
    } catch (err) {
        logger.error(err);
        ctx.status = 400;
        failureOccured = true;
    }

    if (data.dryRun || failureOccured) {
        await DBConnector.rollbackTransaction();

        ctx.body = {status: `${failureOccured ? "Error creating user" : "OK"}`};
    } else {
        try {
            // The User info has officially been inserted into the DB
            // Now add the profile data to ES
            const profileData = {
                firstName: first,
                lastName: last,
                userName: data.userName,
                userId
            };

            // Insert into ES
            const esResult = await insertProfile(profileData);

            // Now add a profile vertex to the graph
            let graphResult = await DBConnector.getGraph(true)?.addV("Profile")
                .property("profileId", esResult._id)
                .next();  

            if(graphResult == null || graphResult.value == null) {
                throw new Error("Error creating profile");
            }

            // Now add the edges between the profile and user verticies            
            graphResult = await DBConnector.getGraph(true)?.V(graphResult.value.id)
                .as('profile')
                .V(userId)
                .as('user')
                .addE("profile_to_user")
                .from_("profile")
                .to("user")
                .addE("user_to_profile").
                from_("user")
                .to("profile")            
                .next();  

            if(graphResult == null || graphResult.value == null) {
                throw new Error("Error creating profile links");
            }            

            await DBConnector.commitTransaction();

            ctx.body = {status: "OK"};
            ctx.status = 200;
        } catch (err) {            
            logger.error(`Error Commiting transaction: ${err}`);
            await DBConnector.rollbackTransaction();
            ctx.status = 400;
            ctx.body = {status: "Error creating user"};
        }
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
        ctx.body = { status: "Invalid confirmation input" };
        return;
    }

    // Determine if value passed an email address or phone num
    const isEmailAddr: boolean = isEmail(userData);
    const isPhoneNum: boolean = isPhone(userData);

    //Make sure there isn't any invalid email/phone
    if (!isPhoneNum && !isEmailAddr) {
        ctx.response.res.statusCode = 400;
        ctx.body = { status: "Can't parse confirmation data" };
        return;
    }

    const currentTime = moment();
    const sentTime: string = currentTime.format("YYYY-MM-DD HH:mm:ss.000");
    // generate a token to be used in the and store in the db
    const token: string = crypto.randomUUID().split("-")[0];

    try {
        const res = await DBConnector.getGraph()?.mergeV(new Map([["userData", userData]]))
            .option(DBConnector.Merge().onCreate, new Map([[DBConnector.T().label, "ConfirmCode"], ["token", token], ["userData", userData], ["sentTime", sentTime]]))
            .option(DBConnector.Merge().onMatch, new Map([["token", token], ["sentTime", sentTime]]))
            .next();

        if(res == null || res?.value == null) {
            ctx.status = 400;
            ctx.body = { status: "Invalid confirmation data" };
            return;            
        }

    } catch (err) {
        ctx.status = 500;
        return;
    }

    if (isEmailAddr) {
        // Send email
        const replyToAddress: string = config.get("aws.ses.defaultReplyAddress");

        try {
            await sendEmailByTemplate(SEND_CONFIRM_TEMPLATE, {
                destination: { ToAddresses: [userData] },
                source: replyToAddress,
                template: SEND_CONFIRM_TEMPLATE,
                templateData: {
                    assetHostname: config.get("aws.ses.imageHostName"),
                    emailAddress: userData,
                    code: token
                }
            });
            ctx.body = "OK";
        } catch (err) {
            ctx.body = "Send Error";
        }
    } else {
        // Send SMS
        await sendSMS(userData, token);
    }

    ctx.status = 200;
}

type LoginRequest = {
    userName: string;
    password: string;
}

export const loginUser = async (ctx: Context) => {
    Metrics.increment("accounts.userlogin");

    const data = <LoginRequest>ctx.request.body;

    if (data == null || data.userName == null || data.password == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid username or password" };
        return;
    }
    
    try {
        // Check against the db for username existence
        const result = await DBConnector.getGraph()?.V()
            .hasLabel("User")
            .has("userName", data.userName)
            .project('id', 'userName', 'password')
            .by(DBConnector.T().id)
            .by('userName')
            .by('password')
            .next();

        // Extract the returned value if present
        const value:Map<string, string|number> = result?.value;        
        if (value == null || value.size === 0) {
            ctx.status = 400;
            ctx.body = { status: "Invalid username or password" };
            return;
        }

        if(value != null) {
            type db_result = {
                password: string;
                id: number,
                userName: string;
            }
    
            // Extract the password from the result and compare it with expected

            const dbData: db_result = {
                password: value.get('password') as string,                
                userName: value.get('userName') as string,
                id: value.get('id') as number
            }            

            const passwordMatch: boolean = await bcrypt.compare(data.password, dbData.password);

            if (passwordMatch) {
                // create the JWT token
                const token = jwt.sign(
                    {id: dbData.id},
                    config.get("auth.jwt.secret") as string,
                    {
                        algorithm: 'HS256',
                        allowInsecureKeySizes: true,
                        expiresIn: config.get("auth.jwt.expiration")
                    } as SignOptions
                );
                ctx.status = 200;
                ctx.body = { token: token, userName: data.userName, id: dbData.id };
            }
            else {
                ctx.status = 400;
                ctx.body = { status: "Invalid username or password" };
            }                        
        }
    } catch (err) {
        console.log(err);
        logger.error(err);
        ctx.status = 500;
    }
}

type ForgotRequest = {
    user: string;
}

export const forgotPassword = async (ctx: Context) => {
    Metrics.increment("accounts.forgot");

    const data = <ForgotRequest>ctx.request.body;

    if (data.user == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid user info" };
        return;
    }

    try {
        type db_result = {
            email: string;
            phone: string;
            userName: string;
            id: number;
        }

        const __ = DBConnector.__();
        const result = await DBConnector.getGraph()?.V()
            .hasLabel("User")           
            .or(__.has("email", data.user), __.has("userName", data.user), __.has("phone", data.user))
            .project("email","userName","phone", "id")
            .by("email")
            .by("userName")
            .by("phone")
            .by(DBConnector.T().id)
            .next();

        const value:Map<string, string|number> = result?.value;        
        if (value == null || value.size === 0) {
            ctx.status = 400;
            ctx.body = { status: "Invalid user info" };
            return;
        }

        const dbData: db_result = {
            email: value.get('email') as string,
            phone: value.get('phone') as string,
            userName: value.get('userName') as string,
            id: value.get('id') as number
        }

        const res = await sendForgotMessage(ctx, dbData.email, dbData.phone, dbData.userName, dbData.id);
        if (!res) {
            ctx.status = 400;
            ctx.body = {status: "Failed to send message"};                
            return;
        }
        ctx.status = 200;        
        
    } catch (err) {
        logger.error(err);
        ctx.status = 500;
        return;
    }
}

const sendForgotMessage = async (ctx: Context, email: string, phone: string, userName: string, userId: number) => {
    logger.debug(`Sending lost password message for username: ${userName}`);

    if ((email == null && phone == null) || userName == null) {
        return false;
    }

    // Generate a unique token and store it in the db mapped to the user
    const token: string = crypto.randomUUID().replace(/-/g, "");

    try {
        // Do an upsert so if user clicks resend it updates the existing token
        let res = await DBConnector.getGraph()?.mergeV(new Map([["userId", `${userId}`]]))
            .option(DBConnector.Merge().onCreate, new Map([[DBConnector.T().label, "ForgotToken"], ["token", token], ["userId", `${userId}`]]))
            .option(DBConnector.Merge().onMatch, new Map([["token", token]]))
            .next();

        if(res == null || res?.value == null) {
            ctx.status = 400;
            ctx.body = { status: "Invalid token data" };
            return;            
        }

        // Add edges between the User and ForgotToken verticies
        res = await DBConnector.getGraph()?.V()
            .hasLabel("User")
            .has(DBConnector.T().id, userId)
            .as("user_id")
            .V()
            .hasLabel("ForgotToken")
            .has("userId", userId)
            .as("forgot_user_id")
            .addE("User_to_token")
            .from_("user_id")
            .to("forgot_user_id")
            .addE("Token_to_user")
            .to("user_id")
            .from_("forgot_user_id")            
            .next();

        if(res == null || res?.value == null) {
            ctx.status = 400;
            ctx.body = { status: "Failure creating token" };
            return;            
        }   


        if (email.length > 0) {
            // Send forgot message as an email to user
            const replyToAddress: string = config.get("aws.ses.defaultReplyAddress");

            try {
                const r = await sendEmailByTemplate(FORGOT_PASSWORD_TEMPLATE, {
                    destination: { ToAddresses: [email] },
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

                if (r) {
                    ctx.status = 200;
                    ctx.body = {
                        status: "OK", title: "Email Sent",
                        text: `We sent an email to ${obfuscateEmail(email)} with a link to reset your password`
                    };
                } else {
                    ctx.status = 400;
                    ctx.body = { status: "Failed to send message" };
                }
            } catch (err) {
                logger.error("Error sending forgot password message", err);
                ctx.status = 400;
                ctx.body = { status: "Failed to send message" };
                return false;
            }
        } else {
            // TODO: SMS messaging

            //Send forgot message as an SMS to user
            const message = `A request to reset your Linstagram password was made`
            const r = await sendSMS(phone, message);

            if (r) {
                ctx.status = 200;
                ctx.body = {
                    status: "OK", title: "SMS Sent",
                    text: `A request to reset your Linstagram password was made. Use this link to reset your password ${obfuscatePhone(phone)}`
                };
            } else {
                ctx.status = 400;
                ctx.body = { status: "Failed to send message" };
                return false;
            }
        }

        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

type ChangePasswodType = {
    token?: string;
    userName?: string;
    oldPassword?: string;
    password1: string;
    password2: string;
}
export const changePassword = async (ctx: Context) => {
    Metrics.increment("accounts.changePassword");

    const data = <ChangePasswodType>ctx.request.body;

    if (data == null) {
        ctx.status = 400;
        ctx.body = { status: "Invalid params" };
        return;
    }    

    if (data.password1 !== data.password2) {
        ctx.status = 400;
        ctx.body = { status: "Passwords don't match" };
        return;
    }

    if (!isValidPassword(data.password1)) {
        // Password does not pass rules check
        ctx.status = 400;
        ctx.body = {status: "Invalid Password"};
        return;
    }

    if (data.token == null && (data.userName == null || data.oldPassword == null)) {
        ctx.status = 400;
        ctx.body = { status: "Invalid username, password, or token" };
        return;
    }

    const hashedPassword = await bcrypt.hash(data.password1, 10);

    try {
        if (data.userName != null) {
            if (data.oldPassword == null) {
                ctx.status = 400;
                ctx.body = { status: "Invalid username, password, or token" };
                return;
            }

            let result = await DBConnector.getGraph()?.V()
                .hasLabel("User")
                .has("userName", data.userName)
                .project('id', 'userName', 'password')
                .by(DBConnector.T().id)
                .by('userName')
                .by('password')
                .next();

            // Extract the returned value if present
            const value:Map<string, string|number> = result?.value;        
            if (value == null || value.size === 0) {
                ctx.status = 400;
                ctx.body = { status: "Invalid username or password" };
                return;
            }

            type db_result = {
                password: string;
                id: number,
                userName: string;
            }
    
            // Extract the password from the result and compare it with expected
            const dbData: db_result = {
                password: value.get('password') as string,                
                userName: value.get('userName') as string,
                id: value.get('id') as number
            }            

            const passwordMatch: boolean = await bcrypt.compare(data.oldPassword, dbData.password);

            if (!passwordMatch) {
                ctx.status = 400;
                ctx.body = { status: "Invalid username or password" };
                return;
            }                
            
            // Use the username and password to change password   
            result = await DBConnector.getGraph()?.V()
                .hasLabel("User")
                .has('userName', data.userName)
                .property('password', hashedPassword)
                .next();

            if(result?.value == null) {
                ctx.status = 400;
                ctx.body = { status: "Invalid username, password, or token" };
                return;                
            }
        } else {
            // use the token to change password and then delete the token from the db
            await DBConnector.beginTransaction();

            const token: string = data.token ? data.token : "";

            // Get the token from the db if it exists
            let result = await DBConnector.getGraph(true)?.V()
                .hasLabel("ForgotToken")
                .has('token', token)
                .out("Token_to_user")
                .next();

            let value = result?.value;
            if(value == null || value.id == null) {
                throw new Error("Invalid token");          
            }            

            // Update the password in the User vertex            
            result = await DBConnector.getGraph(true)?.V(value.id)
                .property('password', hashedPassword)
                .next();            
                
            value = result?.value;
            if(value == null || value.id == null) {
                throw new Error("Couldn't change password");              
            }

            // Now delete the forgot token vertex
            result = await DBConnector.getGraph(true)?.V(value.id).out("User_to_token").drop().next();       

            // Done!
            await DBConnector.commitTransaction();
        }
    } catch (err) {
        console.log(err);
        logger.error(err);
        await DBConnector.rollbackTransaction();

        ctx.status = 400;
        ctx.body = { status: "Error with token" };
        return;
    }

    ctx.status = 200;
    ctx.body = { status: "OK" };
}

type FollowingType = {
    userId: string;
    followId: string;
    follow: boolean;
}

export const toggleFollowing = async (ctx: Context) => {
    Metrics.increment("accounts.toggleFollowing");

    const data = <FollowingType>ctx.request.body;

    try {
        DBConnector.beginTransaction();

        if(data.follow) {
            //Adding a new follower
            const result = await DBConnector.getGraph(true)?.V()
                .hasLabel("User")
                .has(DBConnector.T().id, data.userId)
                .as("user_id")
                .V()
                .hasLabel("User")
                .has(DBConnector.T().id, data.followId)
                .as("follow_id")
                .addE("User_follows")
                .from_("user_id")
                .to("follow_id")
                .next();

            if(result == null || result?.value == null) {
                throw new Error("Failure to follow user");
            }   
        } else {
            // unfollow the given follower
            await DBConnector.getGraph(true)?.V(data.userId)
                .outE("User_likes")
                .where(DBConnector.__().inV().hasId(data.followId))
                .drop()
                .next();
        }

        await DBConnector.commitTransaction();

    } catch(err) {
        logger.error(err);
        await DBConnector.rollbackTransaction();

        ctx.status = 400;
        ctx.body = { status: "Error changing follower status" };
        return;        
    }

    ctx.status = 200;
    ctx.body = { status: "OK" };   
}

type BulkFollowResultEntry = {
    firstName: string;
    lastName: string;
    userName: string;
    userId: string;
    followId?: string|null;
    pfp?: string|null;
}

interface BulkFollowResultEntryInt {
    [key: string]: BulkFollowResultEntry;
}

type BulkFollowDataType = {
    userId: string;
    userIds: string[];
};

export const postBulkGetInfoAndFollowStatus = async(ctx: Context) => {
   /* Metrics.increment("accounts.postBulkGetInfoAndFollowStatus");

    const data = <BulkFollowDataType>ctx.request.body;
    
    try {
        const results = await DBConnector.query(`
            SELECT 
                u.FIRST_NAME AS firstName, 
                u.LAST_NAME AS lastName, 
                u.USERNAME AS userName, 
                u.ID AS userId, 
                f.USER_ID as followId
            FROM Users u 
            LEFT OUTER JOIN Follows f on f.FOLLOWS_USER_ID = u.id AND f.USER_ID = ?
            WHERE u.ID IN (?)`, [data.userId, data.userIds]);

        const resultMap:BulkFollowResultEntryInt = {};
        results.data.map(entry => {            
            const e = entry as BulkFollowResultEntry;
            resultMap[e.userId] = e;
        });            

        ctx.body = resultMap;

    } catch(err) {
        logger.error(err);
        ctx.status = 400;
        ctx.body = { status: "Error getting follower statuses" };
        return
    }

    ctx.status = 200;  */ 
}