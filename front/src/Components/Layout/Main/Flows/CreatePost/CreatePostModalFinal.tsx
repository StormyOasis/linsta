import React, { RefObject, useState } from "react";
import styled from "styled-components";
import * as styles from '../../Main.module.css';
import { ModalSectionWrapper } from "../../../../../Components/Common/MultiStepModal";
import LeftArrowSVG from "/public/images/left_arrow.svg";
import RightArrowSVG from "/public/images/right_arrow.svg";
import { EditData } from "./CreatePostModal";
import EmojiPickerPopup from "../../../../../Components/Common/EmojiPickerPopup";
import { AuthUser } from "../../../../../api/Auth";
import { useSelector } from "react-redux";
import TextEditor from "../../../../Common/Lexical/TextEditor";

const MAX_TEXT_LENGTH: number = 2047;

const EditContainer = styled.div`
    display: flex;
    position: relative;
    flex-direction: row;
    min-width: calc(${props => props.theme['sizes'].defaultModalWidth} - 40px);
    max-width: calc(${props => props.theme['sizes'].maxModalWidth} - 40px);
    max-height: calc(${props => props.theme['sizes'].maxModalHeight} - 40px);
    min-height: calc(${props => props.theme['sizes'].minModalHeight} - 40px);
`;

const ImageContainer = styled.div`    
    display: flex;
    width: 50%;
    justify-content: flex-end;
    vertical-align: middle;
`;

const ControlsContainer = styled.div`
    display: flex;    
    flex-direction: column;
    width: 50%;  
    padding-left: 5px;
    pointer-events: all;
`;

const ControlContentContainer = styled.div`
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 8px;
`;

const PreviewImage = styled.img`
    display:flex;
    max-height: 100%;
`;

const MediaSliderLeftWrapper = styled.div`
    z-index: 20;
    position: absolute;
    bottom: 43%;
    left: -20px;
`;

const MediaSliderRightWrapper = styled.div`
    z-index: 20;
    position: absolute;
    bottom: 43%;
    right: 47%;
`;

const MediaSliderButton = styled.div`
    width: 24px;
    height: 24px;
    color: ${props => props.theme['colors'].borderDefaultColor};
    background-color: ${props => props.theme['colors'].cropperAspectBkgnd};
    border-radius: 50%;
    padding: 5px; 
    cursor: pointer;
    display: flex;
    
    &:hover {
        color: ${props => props.theme['colors'].borderDefaultColor};
        background-color: ${props => props.theme['colors'].cropperAspectBkgndNoTrans};
    };    
`;

const TextEditorContainerWrapper = styled.div`
    min-height: ${props => props.theme['sizes'].minPostTextEditorHeight};
    max-height: ${props => props.theme['sizes'].minPostTextEditorHeight};
    position: relative;
    align-items: stretch;
    justify-content: flex-start;
    overflow: hidden;
`;

const TextEditorContainer = styled.div`
    align-items: center;
    position: relative;
    width: 100%;  
`;

const TextEditorBottomWrapper = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
`;

const CharacterCountContainer = styled.div`
    color: ${props => props.theme['colors'].borderDarkColor};
    font-size: .9em;
`;

export type CreatePostModalFinalProps = {
    editData: EditData[];
}

const CreatePostModalFinal: React.FC<CreatePostModalFinalProps> = (props: CreatePostModalFinalProps) => {
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const authUser:AuthUser = useSelector((state:any) => state.auth.user);

    const onNextFile = () => {
        setCurrentFileIndex(currentFileIndex + 1);
    }

    const onPrevFile = () => {
        setCurrentFileIndex(currentFileIndex - 1);
    }

    if(props.editData == null || props.editData.length === 0) {
        return null;
    }

    return (
        <>            
            <CreatePostModalFinalEntry 
                authUser={authUser}
                hasNext={currentFileIndex < props.editData.length-1}
                hasPrev={currentFileIndex > 0}
                onNextFile={onNextFile}
                onPrevFile={onPrevFile}
                editData={props.editData[currentFileIndex]}
            />
        </>
    );
};

type CreatePostModalFinalEntryProps = {
    authUser:AuthUser;
    editData: EditData;
    hasNext: boolean;
    hasPrev: boolean;
    onNextFile: () => void;
    onPrevFile: () => void;    
};

const CreatePostModalFinalEntry: React.FC<CreatePostModalFinalEntryProps> = (props:CreatePostModalFinalEntryProps) => {
    const [isFlaggedForReset, setIsFlaggedForReset] = useState(false);
    const [emoji, setEmoji] = useState(null);
    const [charCount, setCharCount] = useState(0);
    const [delCount, setDelCount] = useState(MAX_TEXT_LENGTH+1);

    const resetState = () => { 
        setIsFlaggedForReset(false);
        setCharCount(0);
        setDelCount(MAX_TEXT_LENGTH+1);
        setEmoji(null);
    }

    const handleEmojiSelect = (emoji: any) => {
        // If the user selects the same emoji twice(or more) in a row
        // then the editor won't detect a change, so it won't print 
        // the second emoji. Use a nonce to force the text editor's plugin's
        // useEffect() to detect the change and rerun
        emoji.nonce = crypto.randomUUID();
        setEmoji(emoji);
    }

    const getCurrentLength = (count:number, delCount:number):void => {
        setCharCount(count);
        setDelCount(delCount);
    }

    if(isFlaggedForReset) {
        resetState();
    }

    return (
        <ModalSectionWrapper>
            <EditContainer>                 
                <ImageContainer>
                    {!props.editData.isVideoFile &&  <PreviewImage src={props.editData.editedUrl} />}
                    {props.editData.isVideoFile && <video src={props.editData.originalUrl}></video>}

                    {props.hasPrev && 
                        <MediaSliderLeftWrapper>
                            <MediaSliderButton onClick={() => {props.onPrevFile(); setIsFlaggedForReset(true)}}>
                                <LeftArrowSVG />
                            </MediaSliderButton>
                        </MediaSliderLeftWrapper>
                    }
                    {props.hasNext &&
                        <MediaSliderRightWrapper>
                            <MediaSliderButton onClick={() => {props.onNextFile(); setIsFlaggedForReset(true)}}>
                                <RightArrowSVG />
                            </MediaSliderButton>
                        </MediaSliderRightWrapper>                                                    
                    }                    
                </ImageContainer>
                <ControlsContainer>
                    <div style={{fontWeight: 700, paddingBottom: "10px"}}>
                        {props.authUser.userName}
                    </div>                           
                    <ControlContentContainer>
                        <TextEditorContainerWrapper>
                            <TextEditorContainer>
                                <TextEditor maxTextLength={MAX_TEXT_LENGTH} emoji={emoji} getCurrentLength={getCurrentLength} />                                
                            </TextEditorContainer>                                                         
                            <TextEditorBottomWrapper>
                                <span style={{flexBasis: "75%"}}>
                                    <EmojiPickerPopup onEmojiClick={handleEmojiSelect} />
                                </span>
                                <CharacterCountContainer>
                                    {charCount > (MAX_TEXT_LENGTH+1) ? `${(MAX_TEXT_LENGTH+1)} / ${MAX_TEXT_LENGTH + 1}` : `${charCount} / ${MAX_TEXT_LENGTH + 1}`}
                                </CharacterCountContainer>
                            </TextEditorBottomWrapper>
                        </TextEditorContainerWrapper>                            
                    </ControlContentContainer>
                </ControlsContainer>
            </EditContainer>
        </ModalSectionWrapper>    
    )    
};

export default CreatePostModalFinal;