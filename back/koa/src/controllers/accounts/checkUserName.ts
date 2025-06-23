import { DBConnector, logger, metrics, withMetrics } from '@linsta/shared';
import { Context } from 'koa';
import { handleSuccess, handleValidationError } from '../../utils';

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "accounts.checkunique";
    const ip = ctx.ip;
    
    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

const regex = /^[A-Za-z0-9]+$/;
export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    // Get userName from path parameters
    const { userName } = ctx.params;

    if (!userName || userName.trim().length === 0 || !regex.test(userName)) {
        return handleValidationError(ctx, "Invalid username");
    }

    try {
        const uniquePropertyMatcher = await (await DBConnector.getGraph()).V()
            .hasLabel("User")
            .has("userName", userName)
            .valueMap(true)
            .limit(1)
            .next();

        return handleSuccess(ctx, uniquePropertyMatcher?.value === null);

    } catch (err) {
        logger.error((err as Error).message);
        metrics.increment(`${baseMetricsKey}.errorCount`);        
        return handleValidationError(ctx, "Error checking username uniqueness", 500);
    }
}