import sanitizeHtml from 'sanitize-html';

export const stripNonNumericCharacters = (str: string): string => {
    return str.replace(/\D/g, '');
}

export const isEmail = (str: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return emailRegex.test(str);
}

export const isPhone = (str: string): boolean => {
    const phone = stripNonNumericCharacters(str);
    const phoneRegex = /^\d{7,15}$/;
    return phoneRegex.test(phone);
}

export const isValidPassword = (str: string): boolean => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&^])[A-Za-z\d@.#$!%*?&]{8,15}$/;

    return regex.test(str);
}

export const obfuscateEmail = (email: string | null): string => {
    if (email == null) {
        return "";
    }

    const indexOfAt = email.indexOf("@");
    const starCount = indexOfAt - 2;
    return `${email.at(0)}${"*".repeat(starCount)}${email.at(indexOfAt - 1)}@${email.substring(indexOfAt + 1)}`;
}

export const obfuscatePhone = (phone: string | null): string => {
    if (phone == null) {
        return "";
    }

    return `${phone.slice(0, 2)}${"*".repeat(phone.length - 4)}${phone.slice(-2)}`;
}

export const sanitize = (html: string): string => {
    return sanitizeHtml(html, {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'sub', 'sup'],
        allowedAttributes: {
            'a': ['href']
        },
    }).trim();
}

export const sanitizeInput = (input?: string | null): string => sanitize(input || "");

export const getFileExtByMimeType = (mimeType: string | null): string => {
    switch (mimeType) {
        case "image/jpeg": {
            return ".jpg";
        }
        case "image/png": {
            return ".png";
        }
        case "video/mp4": {
            return ".mp4";
        }
        default: {
            throw new Error("Unknown mime type");
        }
    }
}

export const convertSingleToDoubleQuotes = (input: string) => {
    return input
        .replace(/'/g, '"')                               // Replace all single quotes with double quotes
        .replace(/([{,]\s*)"(.*?)"(?=\s*:)/g, '$1"$2"');  // Ensure property keys are properly quoted
}

export const extractTextSuggestionsFlat = (suggestObj: unknown, size:number = Infinity): string[] => {
    const seen = new Set<string>();
    const flat: string[] = [];

    const suggestEntries = suggestObj as Record<string, Array<{ options: Array<{ text: string }> }>>;
    for (const entries of Object.values(suggestEntries || {})) {
        for (const opt of entries?.[0]?.options || []) {
            if (!seen.has(opt.text)) {
                seen.add(opt.text);
                flat.push(opt.text);
                if (flat.length >= size) {
                    return flat;
                }
            }
        }
    }

    return flat;
};

export const isHashtag = (text: string) => text.startsWith('#');
export const isMention = (text: string) => text.startsWith('@');

export const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#[\p{L}0-9_]+/gu; // Matches hashtags like #fun
    const matches = text.match(hashtagRegex);

    return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : [];
}

export const extractHashtagsAndMentions = (text: string):{hashtags: string[]; mentions: string[]; } => {
    const hashtagRegex = /#(\w+)/g;
    const mentionRegex = /@(\w+)/g;

    const hashtags = [...text.matchAll(hashtagRegex)].map(match => match[0].toLocaleLowerCase());
    const mentions = [...text.matchAll(mentionRegex)].map(match => match[0].toLocaleLowerCase());
  
    return { hashtags, mentions };
}

export const extractFromMultipleTexts = (texts: string[]): { hashtags: string[]; mentions: string[] } => {
    const hashtagSet = new Set<string>();
    const mentionSet = new Set<string>();

    for (const text of texts) {
        const { hashtags, mentions } = extractHashtagsAndMentions(text);
        hashtags.forEach(tag => hashtagSet.add(tag));
        mentions.forEach(mention => mentionSet.add(mention));
    }

    return {
        hashtags: Array.from(hashtagSet),
        mentions: Array.from(mentionSet),
    };
}