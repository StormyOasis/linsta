export type EmojiMatch = Readonly<{
    position: number;
    shortcode: string;
    unifiedID: string;
}>;

// Mapping unified ids to emojis so emoji data can be looked up by id 
let emojiReplacements: Record<string, string> | null = null;
let unifiedToEmoji: Record<string, string> | null = null;
let loadingPromise: Promise<void> | null = null;

export const preloadEmojiData = (): Promise<void> => {
    if (loadingPromise) {
        return loadingPromise;
    }
    loadingPromise = import('./emoji.json').then((mod) => {
        emojiReplacements = mod.default;
        unifiedToEmoji = Object.fromEntries(
            Object.entries(emojiReplacements || {}).map(([k, v]) => [v, k])
        );
    });
    return loadingPromise;
}


export const findEmojiByUnfiedId = (unified: string): string => {
    if (!unifiedToEmoji) {
        throw new Error("Emoji data not loaded yet");
    }    
    return unifiedToEmoji[unified];
}

/**
 * Finds emoji shortcodes in text and if found - returns its position in text, matched shortcode and unified ID
 */
export default function findEmoji(text: string):(EmojiMatch | null)  {
    if (!emojiReplacements) {
        throw new Error("Emoji data not loaded yet");
    }

    const skippedText: string[] = [];

    for (const word of text.split(" ")) {
        if (!emojiReplacements[word]) {
            skippedText.push(word);
            continue;
        }
        if (skippedText.length > 0) {
            // Compensate for space between skippedText and word
            skippedText.push("");
        }

        return {
            position: skippedText.join(" ").length,
            shortcode: word,
            unifiedID: emojiReplacements[word]!,
        };
    }

    return null;
}