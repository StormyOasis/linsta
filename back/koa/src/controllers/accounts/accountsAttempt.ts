import { Context } from 'koa';
import bcrypt from 'bcrypt';
import moment, { MomentInput } from 'moment';
import { DBConnector, IndexService, isEmail, isPhone, isValidPassword, logger, metrics, stripNonNumericCharacters, withMetrics } from '@linsta/shared';
import { handleSuccess, handleValidationError } from '../../utils';

const reservedRoutes = ['edit', 'login', 'signup', 'forgot', 'change_password', 'explore', '404', 'about'];

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

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "accounts.attempt";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const data = <AttemptRequest>ctx.request.body;

    // Confirm overall required fields are present
    if (!validateBaseInput(data)) {
        return handleValidationError(ctx, 'Invalid input');
    }

    // Don't want to allow a username that matches an existing route
    if (reservedRoutes.includes(data.userName.toLowerCase())) {
        return handleValidationError(ctx, "Invalid username");
    }

    if (!isValidPassword(data.password)) {
        // Password does not pass rules check
        return handleValidationError(ctx, "Invalid password");
    }

    // Confirm additional required fields for actual create are present
    if (!data.dryRun && (!data.confirmCode || !isValidDate(data))) {
        return handleValidationError(ctx, "Invalid input");
    }

    const isEmailAddr = isEmail(data.emailOrPhone);
    const isPhoneNum = isPhone(stripNonNumericCharacters(data.emailOrPhone));
    const contact = isPhoneNum ? stripNonNumericCharacters(data.emailOrPhone) : data.emailOrPhone;

    //Make sure there isn't any invalid email/phone
    if (!isEmailAddr && !isPhoneNum) {
        return handleValidationError(ctx, 'Invalid email or phone');
    }

    // If this is not a dry run and instead an actual attempt then 
    // we need to compare the confirmation codes
    if (!data.dryRun && !(await isValidConfirmationCode(contact, data.confirmCode!))) {
        return handleValidationError(ctx, 'Invalid confirmation code');
    }

    //strip out full name into component parts
    const names: string[] = data.fullName.trim().split(' ');
    if (names.length == 0 || names[0] === '') {
        return handleValidationError(ctx, "Invalid full name");
    }
    
    await DBConnector.beginTransaction();
    const graph = await DBConnector.getGraph(true);    
    
    const first: string = names[0];
    const last: string = names.length > 1 ? names[names.length - 1] : "";
    let userId: string | undefined = undefined;
    try {
        const currentTime = moment();
        const timestamp = currentTime.format("YYYY-MM-DD HH:mm:ss.000");
        const momentData: MomentInput = {
            year: data.year,
            month: data.month,
            day: data.day,
            hour: currentTime.hour(),
            minute: currentTime.minute(),
            second: currentTime.second(),
            millisecond: currentTime.millisecond()
        } as MomentInput;

        const birthDate: moment.Moment = data.dryRun ? currentTime : moment(momentData);
        const email: string = isEmailAddr ? contact : "";
        const phone: string = isPhoneNum ? contact : "";

        const __ = DBConnector.__();

        // Email / phone, and userName properties must all be unique. 
        // Check for any existing users that have the given values        
        const uniquePropertyMatcher = await graph.V()
            .hasLabel("User")
            .and(
                __.has("userName", data.userName),
                __.or(
                    __.and(
                        __.has("email", email),
                        __.has("email", DBConnector.P().neq(""))),
                    __.and(
                        __.has("phone", phone),
                        __.has("phone", DBConnector.P().neq(""))))

            )
            .valueMap(true)
            .next();

        if (uniquePropertyMatcher?.value) {
            // An existing entry has been found, we need to error out and eventually rollback
            await DBConnector.rollbackTransaction();
            return handleValidationError(ctx, "Username, email / phone already taken'");
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Attempt to insert a user vertex
        const newUser = await graph
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

        if (!newUser?.value?.id) {
            await DBConnector.rollbackTransaction();
            return handleValidationError(ctx, "Error creating user");
        }

        userId = newUser.value.id;

        if (!data.dryRun && data.confirmCode) {
            // The confirmation code was checked above and succeeded
            // We now want to delete it from the DB
            await graph.V()
                .hasLabel("ConfirmCode")
                .has("userData", contact.trim())
                .drop()
                .toList();
        }
    } catch (err) {
        await DBConnector.rollbackTransaction();
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error creating user")
    }

    // We've done the dry run and succeeded, now rollback and return success
    if (data.dryRun) {
        await DBConnector.rollbackTransaction();
        return handleSuccess(ctx, 'OK');
    }

    // We are no longer on a dry run so changes from here on will be perm unless
    // something goes wrong

    try {
        // Now add the profile data to ES
        const esResult = await IndexService.insertProfile({
            firstName: first,
            lastName: last,
            userName: data.userName,
            userId
        });

        if (!esResult) {
            throw new Error("Error inserting profile");
        }

        // Now update the profile id in the user vertex
        const graphResult = await graph.V(userId)
            .property("profileId", esResult._id)
            .next();

        if (!graphResult?.value) {
            throw new Error("Error creating profile");
        }

        await DBConnector.commitTransaction();

        return handleSuccess(ctx, "OK");
    } catch (err) {
        await DBConnector.rollbackTransaction();
        logger.error(`Error Commiting transaction: ${err}`);
        metrics.increment(`${baseMetricsKey}.errorCount`);
        return handleValidationError(ctx, "Error creating user");
    }
}

const validateBaseInput = (data: AttemptRequest): boolean => {
    return !!(data.emailOrPhone && data.fullName && data.userName && data.password);
};

const isValidDate = (data: AttemptRequest): boolean => {
    return data.year != null && data.month != null && data.day != null;
};

const isValidConfirmationCode = async (userData: string, code: string): Promise<boolean> => {
    try {
        const match = await (await DBConnector.getGraph()).V()
            .hasLabel('ConfirmCode')
            .has('userData', userData.trim())
            .has('token', code.trim())
            .next();
        return !!match?.value;
    } catch (err) {
        logger.error('Confirmation code validation error:', err);
        return false;
    }
};