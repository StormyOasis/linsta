import { getProfile, logger, metrics, withMetrics, type ProfileWithFollowStatus } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";

type GetProfileByUserNameRequest = {
    userName: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "profiles.getprofilebyusername";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { userName } = <GetProfileByUserNameRequest>ctx.request.body;

    if (!userName) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        const profile: ProfileWithFollowStatus | null = await getProfile(null, userName);
        if (profile === null) {
            return handleValidationError(ctx, "Invalid profile");
        }

        return handleSuccess(ctx, profile);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Invalid profile");
    }
};