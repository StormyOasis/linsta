/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TextNode } from "lexical";
import { findEmoji } from "./findEmoji";
import { $createEmojiNode } from "./EmojiNode";
import { useEffect } from "react";

const EmojiPlugin = () => {
    const [editor] = useLexicalComposerContext();

    const $textNodeTransform = async (node: TextNode): Promise<void> => {
        if (!node.isSimpleText() || node.hasFormat('code')) {
            return;
        }

        const text = node.getTextContent();

        // Find only 1st occurrence as transform will be re-run anyway for the rest
        // because newly inserted nodes are considered to be dirty

        const emojiMatch = await findEmoji(text);
        if (emojiMatch === null) {
            return;
        }

        let targetNode;
        if (emojiMatch.position === 0) {
            // First text chunk within string, splitting into 2 parts
            [targetNode] = node.splitText(
                emojiMatch.position + emojiMatch.shortcode.length,
            );
        } else {
            // In the middle of a string
            [, targetNode] = node.splitText(
                emojiMatch.position,
                emojiMatch.position + emojiMatch.shortcode.length,
            );
        }

        const emojiNode = $createEmojiNode(emojiMatch.unifiedID);
        targetNode.replace(emojiNode);
    }

    useEffect(() => {
        editor.registerNodeTransform(TextNode, $textNodeTransform);
    }, [editor]);

    return null;
}

export default EmojiPlugin;