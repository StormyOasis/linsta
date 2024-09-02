/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import emojis from "emoji-datasource-google/emoji.json";

export type EmojiMatch = Readonly<{
    position: number;
    shortcode: string;
    unifiedID: string;
}>;

/**
 * Map where keys are possible replacements while values are unified emoji IDs
 * These IDs are essentially hex encoded UTF-8 characters
 */
const emojiReplacementMap = emojis.reduce<Map<string, string>>((acc, row) => {
    acc.set(`:${row.short_name}:`, row.unified);

    if (row.text != null) {
        acc.set(row.text, row.unified);
    }
    if (row.texts != null) {
        row.texts.forEach((text) => acc.set(text, row.unified));
    }

    return acc;
}, new Map());

/** Mapping unified ids to emojis so emoji data can be looked up by id */
const unifiedToEmojiMap = emojis.reduce<Map<string, any>>((acc, row) => {
    acc.set(row.unified, row);
    return acc;
}, new Map());

export const findEmojiByUnfiedId = (unified: string):any => {
    return unifiedToEmojiMap.get(unified);
}

/**
 * Finds emoji shortcodes in text and if found - returns its position in text, matched shortcode and unified ID
 */
export default function findEmoji(text: string): EmojiMatch | null {
    const skippedText: string[] = [];

    for (const word of text.split(" ")) {        
        if (!emojiReplacementMap.has(word)) {
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
            unifiedID: emojiReplacementMap.get(word)!,
        };
    }

    return null;
}
