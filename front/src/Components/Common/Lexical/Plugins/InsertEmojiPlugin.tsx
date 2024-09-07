import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection } from "lexical";
import { useEffect } from "react";
import { $createEmojiNode } from "./EmojiNode";
import { findEmojiByUnfiedId } from "./findEmoji";

const InsertEmojiPlugin = (props: any) => {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (props.emoji === null) {
            return;
        }

        const emojiMatch = findEmojiByUnfiedId((props.emoji.unified as string).toUpperCase());
        if (emojiMatch === null) {
            return;
        }

        editor.focus();
        editor.update(() => {
            const selection = $getSelection();
            if (selection) {
                selection.insertNodes([$createEmojiNode(props.emoji.unified)]);
            }
        });
    }, [editor, props.emoji]);

    return null;
};

export default InsertEmojiPlugin;