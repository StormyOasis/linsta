import { APIGatewayProxyEvent } from 'aws-lambda';
import Metrics, { withMetrics } from '../../metrics/Metrics';
import logger from '../../logger/logger';
import DBConnector, { EDGE_PARENT_TO_CHILD_COMMENT, EDGE_COMMENT_TO_USER } from '../../connectors/DBConnector';
import { handleSuccess, handleValidationError, verifyJWT } from '../../utils/utils';

type DeleteCommentByIdRequest = {
    commentId: string;
};

export const handler = async (event: APIGatewayProxyEvent) => {
    const baseMetricsKey = "comments.deletecomment";
    return await withMetrics(baseMetricsKey, event, async () => await handlerActions(baseMetricsKey, event));
}

export const handlerActions = async (baseMetricsKey: string, event: APIGatewayProxyEvent) => {
    let data: DeleteCommentByIdRequest;
    try {
        data = JSON.parse(event.body || '{}');
    } catch {
        return handleValidationError("Invalid params");
    }

    if (!data.commentId) {
        return handleValidationError("Invalid params");
    }

    try {
        // Find the user who owns the comment
        const commentUserResult = await (await DBConnector.getGraph()).V(data.commentId).out(EDGE_COMMENT_TO_USER).next();
        if (!commentUserResult?.value) {
            return handleValidationError("Error deleting comment(s)");
        }

        // JWT Authorization: Only the owner can delete
        const userId = commentUserResult.value.id;
        const jwtPayload = verifyJWT(event, userId);
        if (!jwtPayload) {
            return handleValidationError("You do not have permission to access this data", 403);
        }

        // Begin transaction
        await DBConnector.beginTransaction();

        // Recursively delete the comment and its child comments
        const __ = DBConnector.__();
        const results = await (await DBConnector.getGraph(true))
            .V(data.commentId)
            .emit()
            .repeat(__.out(EDGE_PARENT_TO_CHILD_COMMENT))
            .drop()
            .toList();

        if (!results) {
            await DBConnector.rollbackTransaction();
            return handleValidationError("Error deleting comment(s)");
        }

        await DBConnector.commitTransaction();

        return handleSuccess({ status: "OK" });
    } catch (err) {
        Metrics.getInstance().increment(`${baseMetricsKey}.errorCount`);
        await DBConnector.rollbackTransaction();
        logger.error((err as Error).message);
        return handleValidationError("Error deleting comment(s)");
    }
};