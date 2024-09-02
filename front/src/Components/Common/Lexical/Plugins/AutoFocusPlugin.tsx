import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

const AutoFocusPlugin = () => {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        editor.focus();
    }, [editor]);

    return null;
}

export default AutoFocusPlugin;