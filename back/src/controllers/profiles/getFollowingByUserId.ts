import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, { EDGE_USER_FOLLOWS } from '../../connectors/DBConnector';
import { getVertexPropertySafe, handleSuccess, handleValidationError } from '../../utils/utils';
import { ProfileWithFollowStatus } from '../../utils/types';

type GetFollowingByUserIdRequest = {
    userId: string;
};

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "profiles.getfollowingbyid";
    return await withMetrics(baseMetricsKey, event.headers,async () => await handlerActions(baseMetricsKey, event))
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: GetFollowingByUserIdRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params passed");
    }

    if (!data.userId) {
        return handleValidationError("Invalid params passed");
    }

    try {
        const __ = DBConnector.__();
        const results = await (await DBConnector.getGraph()).V(data.userId)
            .hasLabel('User')
            .group()
            .by("userName")
            .by(
                __.out(EDGE_USER_FOLLOWS)
                    .project('followers')
                    .by()
                    .by(
                        __.unfold()
                            .hasLabel('User')
                            .values("userName")
                            .fold()
                    )
                    .unfold()
                    .select(DBConnector.Column().values)
                    .fold()
            )
            .toList();

        if (!results) {
            return handleSuccess([]);
        }

        const following: ProfileWithFollowStatus[] = [];
        for (const result of results) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map: Map<any, any> = (result as Map<any, any>);
            for (const entry of map) {
                for (const user of entry[1]) {
                    const vertexProperties = user.properties;

                    const profile: ProfileWithFollowStatus = {
                        profileId: getVertexPropertySafe(vertexProperties, 'profileId'),
                        bio: getVertexPropertySafe(vertexProperties, 'bio'),
                        pfp: getVertexPropertySafe(vertexProperties, 'pfp'),
                        userId: user.id,
                        userName: getVertexPropertySafe(vertexProperties, 'userName'),
                        firstName: getVertexPropertySafe(vertexProperties, 'firstName'),
                        lastName: getVertexPropertySafe(vertexProperties, 'lastName'),
                        gender: getVertexPropertySafe(vertexProperties, 'gender'),
                        pronouns: getVertexPropertySafe(vertexProperties, 'pronouns'),
                        link: getVertexPropertySafe(vertexProperties, 'link'),
                        isFollowed: true
                    };

                    following.push(profile);
                }
            }
        }

        return handleSuccess(following);
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        logger.error((err as Error).message);
        return handleValidationError("Error getting following users");
    }
};