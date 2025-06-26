import { getLocationData, metrics, withMetrics } from "@linsta/shared";
import { Context } from "koa";
import { handleSuccess, handleValidationError } from "../../utils";

type GetLocationsRequest = {
    term: string
}

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "location.getlocation";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const req = <GetLocationsRequest>ctx.request.query;
    const term = req.term?.trim();
    
    if (!term) {
        return handleValidationError(ctx, "Invalid params passed");
    }

    try {
        const response = await getLocationData(term);
        return handleSuccess(ctx, response.Results);
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        return handleValidationError(ctx, "Error fetching location data", 500);
    }
};