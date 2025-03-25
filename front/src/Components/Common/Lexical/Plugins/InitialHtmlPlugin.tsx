import React, { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $getSelection, $isRangeSelection, $isRootNode } from 'lexical';

// This is wild...Lexical HAS to have a better way to set an initial value that's an html string
const InitialHtmlPlugin = (props: any) => {
    const [editor] = useLexicalComposerContext();
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        editor.update(() => {
            if (isInitialized || props.initialValue == null || props.initialValue.length === 0) {
                return;
            }

            // In the browser you can use the native DOMParser API to parse the HTML string.
            const parser = new DOMParser();
            const dom = parser.parseFromString(props.initialValue, "text/html");
            // Once you have the DOM instance it's easy to generate LexicalNodes.
            const nodes = $generateNodesFromDOM(editor, dom);

            const root = $getRoot();
            root.clear(); // Don't want to double add in the case of React strict mode / dev

            // Select the root
            $getRoot().select();
            // Insert them at a selection.
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
                if ($isRootNode(selection.anchor.getNode())) {
                    selection.insertNodes(nodes)
                }
            }

            setIsInitialized(true);
        });
    }, [editor]);

    return null;
}

export default InitialHtmlPlugin;