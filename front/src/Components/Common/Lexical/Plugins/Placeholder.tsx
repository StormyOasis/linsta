import React from 'react';
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

const Placeholder: React.FC<{placeholder?: string|undefined}> = ({placeholder}) => {
    const [editor] = useLexicalComposerContext();
    const placeholderText: string = placeholder ? placeholder : "Write a caption...";
    return (
        <div className="editor-placeholder" 
            aria-label={placeholderText}
            aria-placeholder={placeholderText}
            onClick={() => {
                editor.focus();
            }}>
            {placeholderText}
        </div>    
    );
}

export default Placeholder;