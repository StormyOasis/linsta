import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import React, { useEffect, useRef } from 'react';
import { Div } from '../../CombinedStyling';

export const ClickToFocusPlugin = (props) => {
    const [editor] = useLexicalComposerContext();
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleClick = () => {
            const domRoot = editor.getRootElement();
            if (!domRoot) return;

            // Only focus if the editor isn't already focused
            if (!domRoot.contains(document.activeElement)) {
                domRoot.focus();   // native DOM focus
                editor.focus();    // Lexical API focus
            }
        };

        container.addEventListener('click', handleClick);
        return () => container.removeEventListener('click', handleClick);
    }, [editor]);

    // This plugin renders a wrapper div
    return (
        <Div ref={containerRef} style={{width:"100%", height: "100%"}}>
            {props.children}
        </Div>
    );
};
