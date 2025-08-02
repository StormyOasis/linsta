import axios from 'axios';
import logger from "../logger";
import config from '../config';

export const getImageCaption = async (url: string): Promise<string> => {
    let caption = '';
    
    try {
        const response = await axios.post(            
            config.ai.autoCaptionUrl, 
            {
                model: "gpt-4-vision-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: 'text', text: 'Write alt text suitable for screen readers.' },
                            {
                                type: "image_url",
                                image_url: {
                                    url,
                                },
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
        
    } catch (error: any) {
        logger.error("Error:", error.response?.data || error.message);
    }
    return caption;
}
