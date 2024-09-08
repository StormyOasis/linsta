import { clear, del, get, set } from 'idb-keyval';
import { blobToBase64 } from "./utils";

export const loadImageCached = async (id: string, url: string): Promise<string> => {
    // First try to get the image from the cache
    const value = await get(id);

    if(value === undefined) {
        // Image not in the cache so have to fetch it
        try {
            const result = await fetch(url);
            if(result.status === 200) {
                const blob = await result.blob();
                const b64:string = await blobToBase64(blob) as string;

                // add the base64 data into the cache and return it
                await set(id, b64);

                return b64;
            }
        } catch(err) {
            console.log(err);
            return url; //default to what was passed in
        }

    } else {
        // Image is in the cache already as a base64 string, use that as is
        return value;
    }

    return url; //default to what was passed in
}

export const setImage = async (id: string, data: string) => {     
    await set(id, data);
}

export const deleteFromCache = async (id: string) => {
    // First try to get the image from the cache
    const value = await get(id);

    if(value === undefined) {
        // key not present in cache so do nothing
        return;
    }

    // delete from the cache
    await del(id);
}

export const clearCache = async () => {
    await clear();
}