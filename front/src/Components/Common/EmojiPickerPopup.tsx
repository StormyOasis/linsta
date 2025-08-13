import React, { SyntheticEvent, useState } from "react";
import { styled } from "styled-components";
import { Flex } from "./CombinedStyling";

import { EmojiStyle } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import loadable from "@loadable/component";

const LazyEmojiPicker = loadable(() =>
    import('emoji-picker-react').then((module) => ({
        default: module.default,
    }))
);

const EmojiPickerButton = styled.button<{ $noPadding: boolean | undefined }>`
    position: relative;
    cursor: pointer;
    outline: none;
    padding: ${props => props.$noPadding ? 0 : "8px"};
    border: none;
    display: flex;
    justify-content: center;
    background-color: transparent;
    z-index: 9;
    width: 24px;
    height: 24px;
    align-items: center;
`;

const EmojiPickerPopupContainer = styled.div<{ $isOpen: boolean }>`
    display: ${props => props.$isOpen ? "flex" : "none"};
    position: fixed;
    bottom: 40px;
    right: 20%;
    height: auto;
    z-index: 9999;  
`;

type EmojiPickerPopupProps = {
    onEmojiClick: (emoji: EmojiClickData) => void;
    noPadding?: boolean;
};

const EmojiPickerPopup: React.FC<EmojiPickerPopupProps> = (props: EmojiPickerPopupProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggleClick = (e: SyntheticEvent) => {
        e.preventDefault();
        setIsOpen(!isOpen);
    }

    const handleEmojiClick = (emojiData: EmojiClickData, _event: MouseEvent) => {
        setIsOpen(false);
        props.onEmojiClick(emojiData);
    }

    const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Escape") { // On escape key press, close the picker
            setIsOpen(false);
        }
    }

    return (
        <>
            <Flex>
                <EmojiPickerButton 
                    onClick={handleToggleClick} 
                    $noPadding={props.noPadding}
                    role="button"
                    aria-pressed={isOpen}>😀</EmojiPickerButton>
                <EmojiPickerPopupContainer $isOpen={isOpen} onKeyUp={handleKeyUp}>
                    <LazyEmojiPicker
                        onEmojiClick={handleEmojiClick}    
                        emojiStyle={EmojiStyle.NATIVE}                    
                        open={isOpen}
                        skinTonesDisabled={true}
                        previewConfig={{ showPreview: false }} />
                </EmojiPickerPopupContainer>
            </Flex>
        </>
    );
};

export default EmojiPickerPopup;