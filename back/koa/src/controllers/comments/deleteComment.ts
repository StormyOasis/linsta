import {
    withMetrics,
    logger,
    metrics,
    DBConnector,
    EDGE_PARENT_TO_CHILD_COMMENT,
    EDGE_COMMENT_TO_USER,
} from '@linsta/shared';
import { handleSuccess, handleValidationError } from '../../utils';
import { Context } from 'koa';

type DeleteCommentByIdRequest = {
    commentId: string;
};

export const handler = async (ctx: Context) => {
    const baseMetricsKey = "comments.deletecomment";
    const ip = ctx.ip;

    return await withMetrics(baseMetricsKey, ip, async () => await handlerActions(baseMetricsKey, ctx));
}

export const handlerActions = async (baseMetricsKey: string, ctx: Context) => {
    const { commentId } = <DeleteCommentByIdRequest>ctx.request?.body;

    if (!commentId) {
        return handleValidationError(ctx, "Invalid params");
    }

    try {
        // Find the user who owns the comment
        const commentUserResult = await (await DBConnector.getGraph()).V(commentId).out(EDGE_COMMENT_TO_USER).next();
        if (!commentUserResult?.value) {
            return handleValidationError(ctx, "Error deleting comment(s)");
        }


        // Begin transaction
        await DBConnector.beginTransaction();

        // Recursively delete the comment and its child comments
        const __ = DBConnector.__();
        const results = await (await DBConnector.getGraph(true))
            .V(commentId)
            .emit()
            .repeat(__.out(EDGE_PARENT_TO_CHILD_COMMENT))
            .drop()
            .toList();

        if (!results) {
            await DBConnector.rollbackTransaction();
            return handleValidationError(ctx, "Error deleting comment(s)");
        }

        await DBConnector.commitTransaction();

        return handleSuccess(ctx, { status: "OK" });
    } catch (err) {
        metrics.increment(`${baseMetricsKey}.errorCount`);
        await DBConnector.rollbackTransaction();
        logger.error((err as Error).message);
        return handleValidationError(ctx, "Error deleting comment(s)");
    }
};