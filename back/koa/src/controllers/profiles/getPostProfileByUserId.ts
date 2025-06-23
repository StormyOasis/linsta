import { getProfile, logger, metrics, type ProfileWithFollowStatus, withMetrics } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";


type GetProfileByUserIdRequest = {
    userId: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "profiles.getprofilebyid";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { userId } = <GetProfileByUserIdRequest>ctx.request.body;

    if (!userId) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        const profile: ProfileWithFollowStatus | null = await getProfile(userId, null);
        if (!profile) {
            return handleValidationError(ctx, "Invalid profile");
        }

        return handleSuccess(ctx, profile);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Invalid profile");
    }
};