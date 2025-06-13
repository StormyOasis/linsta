import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

const AutoFocusPlugin = () => {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const tryFocus = () => {
            const domRoot = editor.getRootElement();
            if (domRoot) {
                domRoot.focus();
                editor.focus();
            } else {
                console.warn('Lexical DOM root not found.');
            }
        };

        const timeout = setTimeout(tryFocus, 50); // short delay ensures DOM mounted

        return () => clearTimeout(timeout);
    }, [editor]);

    return null;
};

export default AutoFocusPlugin;