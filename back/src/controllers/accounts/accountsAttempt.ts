import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import bcrypt from 'bcrypt';
import moment, { MomentInput } from "moment";
import DBConnector from '../../connectors/DBConnector';
import { getESConnector } from '../../connectors/ESConnector';
import {
    isEmail,
    isPhone,
    isValidPassword,
    stripNonNumericCharacters
} from '../../utils/textUtils';
import logger from '../../logger/logger';
import Metrics from '../../metrics/Metrics';
import { handleValidationError, handleSuccess } from '../../utils/utils';

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
};

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    Metrics.increment("accounts.attempt");

    let data: AttemptRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid input");
    }

    let res = null;

    // Confirm overall required fields are present
    if (!data.emailOrPhone || !data.fullName || !data.userName || !data.password) {
        return handleValidationError("Invalid input");
    }

    // Confirm additional required fields for actual create are present
    if (!data.dryRun && (!data.confirmCode || !data.day || !data.month || !data.year)) {
        return handleValidationError("Invalid input");
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
        return handleValidationError("Invalid email or phone");
    }

    //strip out full name into component parts
    const names: string[] = data.fullName.trim().split(' ');
    if (names.length == 0 || names[0] === '') {
        return handleValidationError("Invalid full name");
    }

    if (!data.dryRun) {
        // If this is not a dry run and instead an actual attempt then 
        // we need to compare the confirmation codes
        if (data.confirmCode?.trim().length !== 8 || emailOrPhone.trim().length === 0) {
            return handleValidationError("Invalid confirmation code");
        }

        try {
            // Check if confirmation code + email/phone entry exists
            res = await(await DBConnector.getGraph()).V()
                .hasLabel("ConfirmCode")
                .has("userData", emailOrPhone.trim())
                .has("token", data.confirmCode.trim())
                .next();

            if (res == null || res.value == null) {
                // no matching code found so respond as invalid
                return handleValidationError("Invalid confirmation code");
            }
        } catch (err) {       
            logger.error((err as Error).message);
            return handleValidationError("Error checking confirmation code");
        }
    }

    if (!isValidPassword(data.password)) {
        // Password does not pass rules check
        return handleValidationError("Invalid password");
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
        const __ = DBConnector.__();
        const uniquePropertyMatcher = await(await DBConnector.getGraph(true)).V()
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
            failureOccured = true;            
        } else {
            // Attempt to insert a user vertex
            const result = await(await DBConnector.getGraph(true))
                .addV("User")
                .property("email", email)
                .property("phone", phone)
                .property("userName", data.userName)
                .property("birthDate", birthDate.format("YYYY-MM-DD HH:mm:ss.000"))
                .property("joinDate", timestamp)
                .property("password", hashedPassword)
                .property("pfp", null)
                .property("firstName", first)        
                .property("lastName", last)                    
                .next();                

            if(result == null || result.value == null) {
                failureOccured = true;
            } else {
                userId = result.value.id;

                if (!data.dryRun && data.confirmCode) {
                    // The confirmation code was checked above and succeeded
                    // We now want to delete it from the DB
                    res = await(await DBConnector.getGraph(true)).V()
                        .hasLabel("ConfirmCode")
                        .has("userData", emailOrPhone.trim())
                        .drop().toList();
                }
            }
        }
    } catch (err) {
        logger.error((err as Error).message);
        failureOccured = true;
    }


    if (data.dryRun || failureOccured) {
        await DBConnector.rollbackTransaction();
        if(failureOccured) {
            return handleValidationError("Error creating user")
        } else {                     
            return handleSuccess({status: "OK"});
        }
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
            const esResult = await getESConnector().insertProfile(profileData);

            if(!esResult) {
                throw new Error("Error inserting profile");
            }

            // Now update the profile id in the user vertex
            const graphResult = await(await DBConnector.getGraph(true)).V(userId)
                .property("profileId", esResult._id)
                .next();  

            if(graphResult == null || graphResult.value == null) {
                throw new Error("Error creating profile");
            }

            await DBConnector.commitTransaction();

            return handleSuccess({status: "OK"});
        } catch (err) {            
            await DBConnector.rollbackTransaction();
            logger.error(`Error Commiting transaction: ${err}`);          
            return handleValidationError("Error creating user");
        }
    }
};