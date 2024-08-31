import React, { KeyboardEventHandler, SyntheticEvent, useState } from "react";
import { styled } from "styled-components";
import EmojiPicker, { EmojiClickData, EmojiStyle } from 'emoji-picker-react';

const EmojiPickerButton = styled.button`
    position: relative;
    cursor: pointer;
    outline: none;
    padding: 8px;
    border: none;
    display: flex;
    justify-content: center;
    background-color: transparent;
    z-index: 9;
`;

const EmojiPickerPopupContainer = styled.div<{$isOpen: boolean}>`
    display: ${props => props.$isOpen ? "flex" : "none"};
    position: fixed;
    top: 10px;
    width: 20%;
    height: 50%;
    z-index: 9;
`;

type EmojiPickerPopupProps = {
    onEmojiClick: (emoji: string) => void;
};

const EmojiPickerPopup: React.FC<EmojiPickerPopupProps> = (props: EmojiPickerPopupProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggleClick = (e: SyntheticEvent) => {
        e.preventDefault();
        setIsOpen(!isOpen);
    }

    const handleEmojiClick = (emojiData: EmojiClickData, _event: MouseEvent) => {
        setIsOpen(false);
        props.onEmojiClick(emojiData.emoji);
    }

    const handleKeyUp = (e:React.KeyboardEvent<HTMLDivElement>) => {
        if(e.key === "Escape") { //escape key 
            setIsOpen(false);
        }
    }

    return (
        <>
            <div>
                <EmojiPickerButton onClick={handleToggleClick}>😀</EmojiPickerButton>
                <EmojiPickerPopupContainer $isOpen={isOpen} onKeyUp={handleKeyUp}>
                    <EmojiPicker 
                        onEmojiClick={handleEmojiClick}
                        emojiStyle={EmojiStyle.TWITTER} 
                        open={isOpen} 
                        previewConfig={{showPreview: false}}/>
                </EmojiPickerPopupContainer>
            </div>
        </>
    );
};

export default EmojiPickerPopup;