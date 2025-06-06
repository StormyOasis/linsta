import RedisConnector from "../connectors/RedisConnector";
import logger from "../logger/logger";
import Metrics from "./Metrics";

export const handler = async () => {
    const metrics = Metrics.getInstance();
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1); // process previous minute + some buffer
    const currentMinute = now.toISOString().slice(0, 16);
    const sanitizedMinute = currentMinute.replace(/[:T\-]/g, '_');
    const redisKey = `ips:${currentMinute}`

    const ips = await RedisConnector.sMembers(redisKey); // get all IPs

    for (const ip of ips) {
        //metrics.gauge('lambda.ip_hit', 1, 1, [`ip:${ip}`, `minute:${currentMinute}`]);
        const sanitizedIp = ip.replace(/\./g, '_');
        const metricName = `lambda.ip_hit.${sanitizedIp}.${sanitizedMinute}`;
        metrics.gauge(metricName, 1);        
    }

    // Also send total unique IPs count for that minute
    metrics.gauge(`lambda.unique_ips.${sanitizedMinute}`, ips.length);

    await RedisConnector.del(redisKey);

    const body = `Processed ${ips.length} IPs for ${currentMinute}`;
    logger.info(body);

    return {
        statusCode: 200,
        body,
    };
};