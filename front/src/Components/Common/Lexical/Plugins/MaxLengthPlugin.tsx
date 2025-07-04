/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, RootNode } from "lexical";
import { trimTextContentFromAnchor } from '@lexical/selection';
import { useEffect } from "react";

export function MaxLengthPlugin({ maxLength, getCurrentLength }:
    { maxLength: number, getCurrentLength: (count: number, delCount: number) => void }): null {

    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerNodeTransform(RootNode, (rootNode: RootNode) => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                return;
            }
            const prevTextContent = editor
                .getEditorState()
                .read(() => rootNode.getTextContent());
            const textContent = rootNode.getTextContent();
            if (prevTextContent !== textContent) {
                const textLength = textContent.length;
                const delCount = textLength - maxLength;
                const anchor = selection.anchor;

                getCurrentLength(textLength, delCount);

                if (delCount > 0) {
                    trimTextContentFromAnchor(editor, anchor, delCount);
                }
            }
        });
    }, [editor, maxLength]);

    return null;
}