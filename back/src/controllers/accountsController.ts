import { Context } from "koa";
import bcrypt from 'bcrypt';
import config from 'config';
import jwt, { SignOptions } from 'jsonwebtoken';
import moment, { MomentInput } from "moment";
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";
import DBConnector, { EDGE_TOKEN_TO_USER, EDGE_USER_FOLLOWS, EDGE_USER_TO_TOKEN } from "../Connectors/DBConnector";
import { handleValidationError, isEmail, isPhone, isValidPassword, obfuscateEmail, obfuscatePhone, stripNonNumericCharacters } from "../utils/utils";
import { SEND_CONFIRM_TEMPLATE, 
         FORGOT_PASSWORD_TEMPLATE, 
         sendEmailByTemplate, sendSMS } from "../Connectors/AWSConnector";
import ESConnector from "../Connectors/ESConnector";

export const getIsUnqiueUsername = async (ctx: Context) => {
    Metrics.increment("accounts.checkunique");

    const { userName } = ctx.params;

    // Error out if invalid data
    if (!userName || userName.trim().length === 0) {
        return handleValidationError(ctx, "Invalid username");
    }

    //sanitize input 
    const regex = /^[A-Za-z0-9]+$/;
    if (!regex.test(userName)) {
        return handleValidationError(ctx, "Invalid username format");
    }

    // Check against the db for username existence
    try {
        const uniquePropertyMatcher = await DBConnector.getGraph().V()
            .hasLabel("User")
            .has("userName", userName)
            .valueMap(true)
            .next();
                
        const isUnique = uniquePropertyMatcher?.value === null;

        ctx.body = isUnique;
        ctx.status = 200;
    } catch (err) {
        console.log(err);
        logger.error(err);
        return handleValidationError(ctx, "Error checking username uniqueness");
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

    // Validate required fields
    if (!data.emailOrPhone || !data.fullName || !data.userName || !data.password) {
        return handleValidationError(ctx, "Invalid input");
    }

    if (!data.dryRun && (!data.confirmCode || !data.day || !data.month || !data.year)) {
        return handleValidationError(ctx, "Invalid input");
    }

    let emailOrPhone = data.emailOrPhone;

    // Determine if value passed to emailOrPhone is an email address or phone
    const isEmailAddr: boolean = isEmail(data.emailOrPhone);
    const isPhoneNum: boolean = isPhone(stripNonNumericCharacters(data.emailOrPhone));

    if (isPhoneNum) {
        emailOrPhone = stripNonNumericCharacters(emailOrPhone);
    }

    //Make sure there isn't any invalid email/phone
    if (!isPhoneNum && !isEmailAddr) {
        return handleValidationError(ctx, "Invalid email or phone");
    }

    //strip out full name into component parts
    const names: string[] = data.fullName.trim().split(' ');
    if (names.length == 0) {
        return handleValidationError(ctx, "Invalid full name");
    }

    if (!data.dryRun) {
        // If this is not a dry run and instead an actual attempt then 
        // we need to compare the confirmation codes
        if (data.confirmCode?.trim().length !== 8 || emailOrPhone.trim().length === 0) {
            return handleValidationError(ctx, "Invalid confirmation code");
        }

        try {
            // Check if confirmation code + email/phone entry exists
            res = await DBConnector.getGraph().V()
                .hasLabel("ConfirmCode")
                .has("userData", emailOrPhone.trim())
                .has("token", data.confirmCode.trim())
                .next();

            if (res == null || res.value == null) {
                // no matching code found so respond as invalid
                return handleValidationError(ctx, "Invalid confirmation code");
            }
        } catch (err) {       
            logger.error(err);
            return handleValidationError(ctx, "Error checking confirmation code");
        }
    }

    if (!isValidPassword(data.password)) {
        // Password does not pass rules check
        return handleValidationError(ctx, "Invalid password");
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
        
        const birthDate:moment.Moment = data.dryRun ? currentTime : moment(momentData);
        const email:string = isEmailAddr ? emailOrPhone : "";
        const phone:string = isPhoneNum ? emailOrPhone : "";
        
        await DBConnector.beginTransaction();
        
        // Email, phone, and userName properties must all be unique. 
        // Check for any existing users that have the given values
        // Note: Potential race condition here, but I'm not sure how to resolve it in gremlin so
        // if we end up with duplicate values this is probably the cause    
        const __ = DBConnector.__();
        const uniquePropertyMatcher = await DBConnector.getGraph(true).V()
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
            const result = await DBConnector.getGraph(true)
                .addV("User")
                .property("email", email)
                .property("phone", phone)
                .property("userName", data.userName)
                .property("birthDate", birthDate.format("YYYY-MM-DD HH:mm:ss.000"))
                .property("joinDate", timestamp)
                .property("password", hashedPassword)
                .property("pfp", null)
                .next();                

            if(result == null || result.value == null) {
                failureOccured = true;
                ctx.status = 400;
            } else {
                userId = result.value.id;

                if (!data.dryRun && data.confirmCode) {
                    // The confirmation code was checked above and succeeded
                    // We now want to delete it from the DB
                    res = await DBConnector.getGraph(true).V()
                        .hasLabel("ConfirmCode")
                        .has("userData", emailOrPhone.trim())
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
        ctx.body = { status: failureOccured ? "Error creating user" : "OK" };
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
            const esResult = await ESConnector.getInstance().insertProfile(profileData);

            if(!esResult) {
                throw new Error("Error inserting profile");
            }

            // Now add update the profile id in the user vertex
            const graphResult = await DBConnector.getGraph(true).V(userId)
                .property("profileId", esResult._id)
                .next();  

            if(graphResult == null || graphResult.value == null) {
                throw new Error("Error creating profile");
            }

            await DBConnector.commitTransaction();

            ctx.body = {status: "OK"};
            ctx.status = 200;
        } catch (err) {            
            await DBConnector.rollbackTransaction();
            logger.error(`Error Commiting transaction: ${err}`);            
            return handleValidationError(ctx, "Error creating user");
        }
    }
}

type SendCodeRequest = {
    user: string
}

export const sendConfirmCode = async (ctx: Context) => {
    Metrics.increment("accounts.sendcode");

    const { user: userData } = <SendCodeRequest>ctx.request.query;

    if (!userData || userData.length < 3) {
        return handleValidationError(ctx, "Invalid confirmation input");
    }

    // Determine if value passed an email address or phone num
    const isEmailAddr: boolean = isEmail(userData);
    const isPhoneNum: boolean = isPhone(userData);

    //Make sure there isn't any invalid email/phone
    if (!isPhoneNum && !isEmailAddr) {
        return handleValidationError(ctx, "Can't parse confirmation data");
    }

    const currentTime = moment();
    const sentTime: string = currentTime.format("YYYY-MM-DD HH:mm:ss.000");
    // generate a token to be used in the and store in the db
    const token: string = crypto.randomUUID().split("-")[0];

    try {
        // Upsert into DB
        const res = await DBConnector.getGraph()
            .mergeV(new Map([["userData", userData]]))
            .option(DBConnector.Merge().onCreate, new Map([
                [DBConnector.T().label, "ConfirmCode"],
                ["token", token],
                ["userData", userData],
                ["sentTime", sentTime]
            ]))
            .option(DBConnector.Merge().onMatch, new Map([
                ["token", token],
                ["sentTime", sentTime]
            ]))
            .next();

        if(res == null || res?.value == null) {
            return handleValidationError(ctx, "Failed to generate confirmation code");        
        }

    } catch (err) {
        logger.error(err);
        return handleValidationError(ctx, "Error processing confirmation data");
    }

    try {
        if (isEmailAddr) {
            const replyToAddress:string = config.get("aws.ses.defaultReplyAddress");
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
        } else {
            await sendSMS(userData, token);
            ctx.body = "OK";
        }
    } catch (err) {
        logger.error(err);
        return handleValidationError(ctx, "Error Sending confirmation code");
    }

    ctx.status = 200;
}

type LoginRequest = {
    userName: string;
    password: string;
}

export const loginUser = async (ctx: Context) => {
    Metrics.increment("accounts.userlogin");

    const { userName, password }: LoginRequest = ctx.request.body;

    if (!userName || !password) {
        return handleValidationError(ctx, "Invalid username or password");
    }
    
    try {
        // Check against the db for username existence
        const result = await DBConnector.getGraph().V()
            .hasLabel("User")
            .has("userName", userName)
            .project('id', 'userName', 'password')
            .by(DBConnector.T().id)
            .by('userName')
            .by('password')
            .next();

        // Extract the returned value if present
        const value:Map<string, string|number> = result?.value;        
        if (value == null || value.size === 0) {
            return handleValidationError(ctx, "Invalid username or password");
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

            const passwordMatch: boolean = await bcrypt.compare(password, dbData.password);
            if (!passwordMatch) {
                return handleValidationError(ctx, "Invalid username or password");
            }

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
            ctx.body = { token, userName, id: dbData.id };                     
        }
    } catch (err) {
        console.log(err);
        logger.error(err);
        return handleValidationError(ctx, "Invalid username or password");
    }
}

type ForgotRequest = {
    user: string;
}

export const forgotPassword = async (ctx: Context) => {
    Metrics.increment("accounts.forgot");

    const data = <ForgotRequest>ctx.request.body;

    if (data.user == null) {
        return handleValidationError(ctx, "User info is missing or invalid");
    }

    try {
        type db_result = {
            email: string;
            phone: string;
            userName: string;
            id: number;
        }

        const __ = DBConnector.__();
        const result = await DBConnector.getGraph().V()
            .hasLabel("User")           
            .or(
                __.has("email", data.user), 
                __.has("userName", data.user), 
                __.has("phone", data.user))
            .project("email","userName","phone", "id")
            .by("email")
            .by("userName")
            .by("phone")
            .by(DBConnector.T().id)
            .next();

        const value:Map<string, string|number> = result?.value;        
        if (value == null || value.size === 0) {
            return handleValidationError(ctx, "No matching user found");
        }

        const dbData: db_result = {
            email: value.get('email') as string,
            phone: value.get('phone') as string,
            userName: value.get('userName') as string,
            id: value.get('id') as number
        }

        const res = await sendForgotMessage(ctx, dbData.email, dbData.phone, dbData.userName, dbData.id);
        if (!res) {
            return handleValidationError(ctx, "Failed to send message");
        }
        ctx.status = 200;        
        ctx.body = { status: "OK" };
    } catch (err) {
        logger.error(err);
        return handleValidationError(ctx, "Error handling forgot password");
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
        let res = await DBConnector.getGraph()
            .mergeV(new Map([["userId", `${userId}`]]))
            .option(DBConnector.Merge().onCreate, new Map([[
                DBConnector.T().label, "ForgotToken"], 
                ["token", token], 
                ["userId", `${userId}`]
            ]))
            .option(DBConnector.Merge().onMatch, new Map([["token", token]]))
            .next();      

        if(res == null || res?.value == null) {
            handleValidationError(ctx, "Failed to create or update token");
            return false;
        }

        // Add edges between the User and ForgotToken verticies
        res = await DBConnector.getGraph().V()
            .hasLabel("User")
            .has(DBConnector.T().id, userId)
            .as("user_id")
            .V()
            .hasLabel("ForgotToken")
            .has("userId", userId)
            .as("forgot_user_id")
            .addE(EDGE_USER_TO_TOKEN)
            .from_("user_id")
            .to("forgot_user_id")
            .addE(EDGE_TOKEN_TO_USER)
            .to("user_id")
            .from_("forgot_user_id")            
            .next();

        if(res == null || res?.value == null) {
            handleValidationError(ctx, "Failure creating token");
            return false;                     
        }   


        if (email.length > 0) {
            // Send forgot message as an email to user
            const replyToAddress: string = config.get("aws.ses.defaultReplyAddress");

            try {
                const emailResponse = await sendEmailByTemplate(FORGOT_PASSWORD_TEMPLATE, {
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

                if (emailResponse) {
                    ctx.status = 200;
                    ctx.body = {
                        status: "OK", title: "Email Sent",
                        text: `We sent an email to ${obfuscateEmail(email)} with a link to reset your password`
                    };
                } else {
                    handleValidationError(ctx, "Failed to send message");
                    return false;
                }
            } catch (err) {
                logger.error("Error sending forgot password message", err);
                handleValidationError(ctx, "Failed to send message");
                return false;
            }
        } else {
            // TODO: SMS messaging

            //Send forgot message as an SMS to user
            const message = `A request to reset your Linstagram password was made`
            const response = await sendSMS(phone, message);

            if (response) {
                ctx.status = 200;
                ctx.body = {
                    status: "OK", title: "SMS Sent",
                    text: `A request to reset your Linstagram password was made. Use this link to reset your password ${obfuscatePhone(phone)}`
                };
            } else {
                handleValidationError(ctx, "Failed to send message");
                return false;
            }
        }

        return true;
    } catch (err) {
        console.log(err);
        logger.error("Error handling forgot message:", err);
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

    if (data == null || (data.token == null && (data.userName == null || data.oldPassword == null))) {
        return handleValidationError(ctx, "Invalid parameters or missing token");
    }    

    if (data.password1 !== data.password2) {
        return handleValidationError(ctx, "Passwords don't match");
    }

    if (!isValidPassword(data.password1)) {
        // Password does not pass rules check
        return handleValidationError(ctx, "Invalid password format");
    }

    const hashedPassword = await bcrypt.hash(data.password1, 10);

    try {
        if (data.userName != null) {
            if (data.oldPassword == null) {
                return handleValidationError(ctx, "Invalid parameters or missing token");
            }

            let result = await DBConnector.getGraph().V()
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
                return handleValidationError(ctx, "Invalid username or password");
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
                return handleValidationError(ctx, "Invalid username or password");
            }                
            
            // Use the username and password to change password   
            result = await DBConnector.getGraph().V()
                .hasLabel("User")
                .has('userName', data.userName)
                .property('password', hashedPassword)
                .next();

            if(result?.value == null) {
                return handleValidationError(ctx, "Invalid username or password");       
            }
        } else {
            // use the token to change password and then delete the token from the db
            await DBConnector.beginTransaction();

            const token: string = data.token ? data.token : "";

            // Get the token from the db if it exists
            let result = await DBConnector.getGraph(true).V()
                .hasLabel("ForgotToken")
                .has('token', token)
                .out(EDGE_TOKEN_TO_USER)
                .next();

            let value = result?.value;
            if(value == null || value.id == null) {
                return handleValidationError(ctx, "Invalid token");               
            }            

            // Update the password in the User vertex            
            result = await DBConnector.getGraph(true).V(value.id)
                .property('password', hashedPassword)
                .next();            
                
            value = result?.value;
            if(value == null || value.id == null) {
                return handleValidationError(ctx, "Error changing password");                      
            }

            // Now delete the forgot token vertex
            result = await DBConnector.getGraph(true)
                .V(value.id)
                .out(EDGE_USER_TO_TOKEN)
                .drop()
                .next();       

            // Done!
            await DBConnector.commitTransaction();
        }
    } catch (err) {
        console.log(err);
        logger.error(err);
        await DBConnector.rollbackTransaction();

        return handleValidationError(ctx, "Error with token");        
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
        await DBConnector.beginTransaction();

        if(data.follow) {
            //Adding a new follower
            const result = await DBConnector.getGraph(true).V(data.userId)
                .as("user_id")
                .V(data.followId)
                .as("follow_id")
                .addE(EDGE_USER_FOLLOWS)
                .from_('user_id')
                .to('follow_id')
                .next();                

            if(result == null || result?.value == null) {
                return handleValidationError(ctx, "Error following user");      
            }   
        } else {
            // unfollow the given follower
            await DBConnector.getGraph(true).V(data.userId)
                .outE(EDGE_USER_FOLLOWS)
                .where(DBConnector.__().inV().hasId(data.followId))
                .drop()
                .next();          
        }

        await DBConnector.commitTransaction();

    } catch(err) {
        console.log(err);
        logger.error(err);
        await DBConnector.rollbackTransaction();
        return handleValidationError(ctx, "Error changing following status");         
    }

    ctx.status = 200;
    ctx.body = { status: "OK" };   
}