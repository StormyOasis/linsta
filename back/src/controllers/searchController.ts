import { Context } from "koa";
import config from 'config';
import Metrics from "../metrics/Metrics";
import { combinedSearch, handleValidationError } from "../utils/utils";
import ESConnector from "../Connectors/ESConnector";

export const getSearch = async (ctx: Context) => {
    Metrics.increment("search.getSearch");

  /*  const q = ctx.query.q?.toString();
    const isAuto = ctx.query.auto === 'true';
    const searchType = ctx.query.searchType?.toString();
    const searchAfter = ctx.query.cursor ? JSON.parse(ctx.query.cursor as string) : undefined;
  
    if (q == null || searchType == null) {
        return handleValidationError(ctx, "Missing required search params");
    }

    try {
        const resultSize: number = config.get("es.defaultAutoResultSize");
        const result = await combinedSearch(q, isAuto, searchType, searchAfter, resultSize);
        ctx.body = result;
        ctx.status = 200;
    } catch (err) {
        console.log(err);
        ctx.status = 500;
        ctx.body = { error: 'An error occurred while performing the search.' };
    } */   
}

export const getSuggestions = async (ctx: Context) => {
    Metrics.increment("search.getSuggestions");

    const q = ctx.query.q?.toString();    
  
    if (q == null) {
        return handleValidationError(ctx, "Missing required search params");
    }    

    try {
        const result = await ESConnector.getInstance().getAllSuggestions(q);
        ctx.body = result;
        ctx.status = 200;
    } catch (err) {
        console.log(err);
        ctx.status = 500;
        ctx.body = { error: 'An error occurred while performing the search.' };
    }     
}