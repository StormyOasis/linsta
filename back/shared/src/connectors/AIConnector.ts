import axios from "axios";
import logger from "../logger";
import config from "../config";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getImageCaption = async (url: string): Promise<string> => {
    let caption = "";
    const maxRetries = 3;
    const retryDelay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.post(
                config.ai.autoCaptionUrl,
                {
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Write alt text suitable for screen readers.",
                                },
                                {
                                    type: "image_url",
                                    image_url: {url},
                                },
                            ],
                        },
                    ],
                    max_tokens: 100,
                },
                {
                    headers: {
                        Authorization: `Bearer ${config.ai.openApiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            caption = response.data.choices[0].message.content;
            return caption; // success, return early
        } catch (error: any) {
            logger.error(
                `Attempt ${attempt} failed:`,
                error.response?.data || error.message
            );

            if (attempt < maxRetries) {
                await delay(retryDelay * attempt); // optional exponential backoff
            } else {
                logger.error("All retry attempts failed.");
            }
        }
    }

    return caption;
};
