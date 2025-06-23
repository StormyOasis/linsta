import { logger, metrics, SuggestService, withMetrics } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "search.getpostsuggestions";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { resultSize, type, q } = ctx.request.query;
    
    if (!q) {
        return handleValidationError(ctx, "Missing required search params");
    }

    try {
        const result = await SuggestService.getSuggestions(q as string, (type || "both") as string, resultSize as string);
        return handleSuccess(ctx, result);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        logger.error("Suggest error", err);
        return handleValidationError(ctx, "An error occurred while performing the search");
    }
};