import { Context } from "koa";
import Metrics from "../metrics/Metrics";

export const addPost = async (ctx: Context) => {
    Metrics.increment("posts.addPost");

    const data = ctx.request.body;
    const files = ctx.request.files;
    
    if (!data || !files) {
        ctx.status = 400;
        return;
    }

    const global = JSON.parse(data.global);
    const entries = JSON.parse(data.entries);

    console.log(global);
    console.log(entries);
    console.log(files);

    //ctx.body = 
    ctx.status = 200;
}