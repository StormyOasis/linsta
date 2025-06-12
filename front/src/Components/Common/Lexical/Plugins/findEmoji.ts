export type EmojiMatch = Readonly<{
    position: number;
    shortcode: string;
    unifiedID: string;
}>;

const EMOJI_JSON_URL = 'https://cdn.jsdelivr.net/npm/emoji-datasource-google@latest/emoji.json';

let emojiReplacementMap: Map<string, string> = new Map();
let unifiedToEmojiMap: Map<string, any> = new Map();

let isEmojiDataLoaded = false;

export async function loadFullEmojiData(): Promise<void> {
    if (isEmojiDataLoaded) return;

    const response = await fetch(EMOJI_JSON_URL);
    if (!response.ok) {
        throw new Error(`Failed to load emoji data: ${response.status}`);
    }

    const emojis = await response.json();

    emojiReplacementMap = new Map();
    unifiedToEmojiMap = new Map();

    for (const row of emojis) {
        emojiReplacementMap.set(`:${row.short_name}:`, row.unified);

        if (row.text != null) {
            emojiReplacementMap.set(row.text, row.unified);
        }

        if (row.texts != null) {
            for (const t of row.texts) {
                emojiReplacementMap.set(t, row.unified);
            }
        }

        unifiedToEmojiMap.set(row.unified, row);
    }

    isEmojiDataLoaded = true;
}

export async function findEmoji(text: string): Promise<EmojiMatch | null> {
    if (!isEmojiDataLoaded) {
        await loadFullEmojiData();
    }

    const skippedText: string[] = [];

    for (const word of text.split(" ")) {
        if (!emojiReplacementMap.has(word)) {
            skippedText.push(word);
            continue;
        }

        if (skippedText.length > 0) {
            skippedText.push("");
        }

        return {
            position: skippedText.join(" ").length,
            shortcode: word,
            unifiedID: emojiReplacementMap.get(word)!,
        };
    }

    return null;
}

export async function findEmojiByUnfiedId(unified: string): Promise<any | null> {
    if (!isEmojiDataLoaded) {
        await loadFullEmojiData();
    }    
    return unifiedToEmojiMap.get(unified);
}
