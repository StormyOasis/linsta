/*import { Context } from "koa";
import Metrics from "../metrics/Metrics";

import { getLocationData } from "../connectors/AWSConnector";

type GetLocationsRequest = {
    term: string
}

export const getLocation = async (ctx: Context): Promise<void> => {
    Metrics.increment("locations.getData");

    const req = <GetLocationsRequest>ctx.request.query;
    const userData = req.term?.trim();
    
    if (!userData || userData.length === 0) {
        ctx.status = 400;
        return;
    }

    const response = await getLocationData(userData);

    ctx.body = response.Results;
    ctx.status = 200;
}*/