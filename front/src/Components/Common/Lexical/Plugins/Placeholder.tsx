import React from 'react';
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

const Placeholder = () => {
    const [editor] = useLexicalComposerContext();
    
    return (
        <div className="editor-placeholder" 
            aria-label="Write a caption" 
            aria-placeholder="Write a caption"
            onClick={() => {
                editor.focus();
            }}>
            Write a caption...
        </div>    
    );
}

export default Placeholder;