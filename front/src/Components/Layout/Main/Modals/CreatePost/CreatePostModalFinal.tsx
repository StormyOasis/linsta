import React, { useState } from "react";
import styled from "styled-components";
import * as styles from '../../Main.module.css';
import { ModalSectionWrapper } from "../../../../Common/MultiStepModal";

import { EditData } from "./CreatePostModal";
import EmojiPickerPopup from "../../../../Common/EmojiPickerPopup";
import { AuthUser } from "../../../../../api/Auth";
import { useSelector } from "react-redux";
import TextEditor from "../../../../Common/Lexical/TextEditor";
import Dropdown from "../../../../Common/Dropdown";
import ToggleSwitch from "../../../../Common/ToggleSwitch";
import { Div, Flex, FlexColumn, FlexRow, Span } from "../../../../Common/CombinedStyling";
import LocationPopup from "../../../../Common/LocationPopup";
import MediaSliderButton from "../../../../Common/MediaSliderButton";
import CollabPopup from "../../../../../Components/Common/CollabPopup";
import { CollabData } from "src/api/types";

const MAX_TEXT_LENGTH: number = 2047;

const EditContainer = styled(FlexRow)`
    position: relative;
    min-width: calc(${props => props.theme['sizes'].defaultModalWidth} - 40px);
    max-width: calc(${props => props.theme['sizes'].maxModalWidth} - 40px);
    height: 100%;
    min-height: calc(${props => props.theme['sizes'].minModalHeight} - 40px);

    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
        flex-direction: column;
        max-height: unset;
        min-width: 100%;
        max-width: 100%;
    }
        
    @media (min-width: ${props => props.theme["breakpoints"].md}px) {
        width: 100%;
        max-width: 820px;
        min-height: calc(${props => props.theme['sizes'].minModalHeight} - 40px);
        max-height: 412px;
    }    
`;

const ImageContainer = styled(Flex)`
    position: relative;
    width: 386px; 
    justify-content: center;
    align-items: center;

    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
        max-width: 100%;
        height: auto;
        flex: 0 0 auto;
        overflow: visible;
        width: 100%;
    }
`;

const ControlsContainer = styled(FlexColumn)` 
    width: 386px;  
    padding-left: 5px;
    pointer-events: all;

    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
        width: 100%;
        max-width: 100%;
        padding-left: 0;
        margin-top: 10px;
    }    
`;

const ControlContentContainer = styled(FlexColumn)`
    overflow-x: hidden;
    overflow-y: auto;
    height: 100%;
`;

const PreviewImage = styled.img`
    display:flex;
    width: 386px;
    height:412px;
    object-fit: cover;
    overflow: hidden;

    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
        width: 100%;
        height: auto;
        max-height: 412px;
    }    
`;

const PreviewVideo = styled.video`
    display:flex;
    width: 386px;
    height:412px;
    object-fit: cover;
    overflow: hidden;

    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
        width: 100%;
        height: auto;
        max-height: 412px;
    }    
`;

const TextEditorContainerWrapper = styled(Div)`
    min-height: ${props => props.theme['sizes'].minPostTextEditorHeight};
    max-height: ${props => props.theme['sizes'].maxPostTextEditorHeight};
    position: relative;
    align-items: stretch;
    justify-content: flex-start;
    overflow: hidden;
    border: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 8px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
`;

const TextEditorContainer = styled(Div)`
    align-items: center;
    position: relative;
    width: 100%;  
`;

const TextEditorBottomWrapper = styled(Div)`
    display: flex;
    align-items: center;
    width: 100%;
`;

const CharacterCountContainer = styled(Div)`
    color: ${props => props.theme['colors'].mediumTextColor};
    font-size: .9em;
`;

const AdditionalControlsContainer = styled(Div)`
    padding-right: 5px;
`;

const InputContainer = styled(Div)`
    margin-top: 10px;
`;

const Label = styled.label`
    display: flex;
    flex-direction: row;
    align-content: center;
`;

const Input = styled.input`
    width: 100%;
    height: 30px;
    border: none;
    font-size: 1.05em;

    &:focus {
        outline: none;
    }
`;

const Text = styled(Div)`
    position: relative;
    word-wrap: break-word;
    word-break: break-word;
    padding: 12px 0;
    font-size: .85em;
    color: ${props => props.theme['colors'].mediumTextColor};
`;

const AltInput = styled(Input)`
    border: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 4px;    
    margin-left: 5px;
`;

const AltImage = styled(Div)<{$editData:EditData}>`
    background-image: url('${props => props.$editData.data}');
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    max-width: 64px;
    width: 64px;
    max-height: 32px;
`;

const AltVideo = styled.video`
    max-width: 64px;
    width: 64px;
    max-height: 32px;
`;

const AdvancedDropdownLabel = styled.label`
    width: 100%;
    line-height: 20px;
    font-size: 16px;
`;

export type CreatePostModalFinalProps = {
    lexicalText?: string;
    locationText?: string;
    isCommentsDisabled: boolean;
    isLikesDisabled: boolean;
    hasErrorOccured: boolean;
    editData: EditData[];
    hideAdvancedSettings?: boolean;
    collabData: CollabData;
    onLexicalChange: (data: string, charCount: number) => void;
    onDisableCommentsChanged: (value: boolean) => void;
    onDisableLikesChanged: (value: boolean) => void;
    onLocationChanged: (value: string) => void;
    onCollabChanged: (data: CollabData) => void;
    onAltImageChanged: (index: number, value: string) => void;
}

const CreatePostModalFinal: React.FC<CreatePostModalFinalProps> = (props: CreatePostModalFinalProps) => {
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [isFlaggedForReset, setIsFlaggedForReset] = useState(false);
    const [emoji, setEmoji] = useState(null);
    const [charCount, setCharCount] = useState(0);

    const authUser:AuthUser = useSelector((state:any) => state.auth.user);

    const handleNextFile = () => {
        setCurrentFileIndex(currentFileIndex + 1);
    }

    const handlePrevFile = () => {             
        setCurrentFileIndex(currentFileIndex - 1);
    }

    const resetState = () => { 
        setIsFlaggedForReset(false);
        setCharCount(0);
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

    const getCurrentLength = (count:number, _delCount:number):void => {
        setCharCount(count);
    }

    const handleLexicalChange = (data: string) => {
        props.onLexicalChange(data, charCount);
    }

    const renderAltImages = () => {
        const altImages:any = [];
        
        props.editData.forEach(data => {
            altImages.push(
                <FlexRow key={data.originalUrl}>
                    {!data.isVideoFile && 
                        <AltImage 
                            aria-label="Current image" 
                            aria-placeholder="Current image"
                            $editData={data} />
                    }
                    {data.isVideoFile && 
                        <AltVideo 
                            aria-label="Current video" 
                            aria-placeholder="Current video"
                            src={data.originalUrl} />                                        
                    }
                    <Label style={{width: "100%"}}>
                        <AltInput type="text" placeholder="Add Alt Text" spellCheck={true} 
                            aria-label="Add Alt Text" aria-placeholder="Add Alt Text"
                            name="altInput" id={`altInputId_${data.index}`}
                            value={data.altText || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                props.onAltImageChanged(data.index, e.currentTarget.value)}>                          
                        </AltInput>
                    </Label>
                </FlexRow>                
            );            
        });

        return altImages;
    }

    if(props.editData == null || props.editData.length === 0) {
        return null;
    }         

    if(isFlaggedForReset) {
        resetState();
    }

    const data = props.editData[currentFileIndex];

    return (
        <>
            {props.hasErrorOccured && <Div $fontWeight="700" $color="red" $textAlign="center" $marginBottom="5px">An error occured when submitting your post</Div>}
            <ModalSectionWrapper>
                <EditContainer>                 
                    <ImageContainer>
                        {!data.isVideoFile && <PreviewImage src={data.data} />}
                        {data.isVideoFile && <PreviewVideo src={data.originalUrl}></PreviewVideo>}

                        {(currentFileIndex > 0) && 
                            <MediaSliderButton direction="left" onClick={() => {handlePrevFile(); setIsFlaggedForReset(true)}} />
                        }
                        {(currentFileIndex < props.editData.length-1) &&
                            <MediaSliderButton direction="right" onClick={() => {handleNextFile(); setIsFlaggedForReset(true)}} />
                        }                    
                    </ImageContainer>
                    <ControlsContainer>
                        <Div $fontWeight="700" $paddingBottom="10px">
                            {authUser.userName}
                        </Div>                           
                        <ControlContentContainer>
                            <TextEditorContainerWrapper>
                                <TextEditorContainer>
                                    <TextEditor 
                                        onChange={handleLexicalChange} 
                                        defaultValue={props.lexicalText}
                                        maxTextLength={MAX_TEXT_LENGTH} 
                                        emoji={emoji} 
                                        getCurrentLength={getCurrentLength} />                                
                                </TextEditorContainer>                                                         
                                <TextEditorBottomWrapper>
                                    <Span $flexBasis="75%">
                                        <EmojiPickerPopup onEmojiClick={handleEmojiSelect} />
                                    </Span>
                                    <CharacterCountContainer>
                                        {charCount > (MAX_TEXT_LENGTH+1) ? 
                                            `${(MAX_TEXT_LENGTH+1)} / ${MAX_TEXT_LENGTH + 1}` : 
                                            `${charCount} / ${MAX_TEXT_LENGTH + 1}`}
                                    </CharacterCountContainer>
                                </TextEditorBottomWrapper>
                            </TextEditorContainerWrapper>
                            <AdditionalControlsContainer>
                                <InputContainer>
                                    <LocationPopup locationText={props.locationText} onLocationChanged={props.onLocationChanged} />
                                </InputContainer>
                               <InputContainer>
                                    <CollabPopup searchText={""} collabData={props.collabData} onCollabChanged={props.onCollabChanged} />
                                </InputContainer>     
                                <Dropdown title="Accessibility">
                                    <div>
                                        <Text>
                                            Alt text describes your photos and videos for people with visual impairments.
                                        </Text>
                                        {renderAltImages()}
                                    </div>
                                </Dropdown>
                                {!props.hideAdvancedSettings &&
                                    <Dropdown title="Advanced Settings">
                                        <FlexColumn>
                                            <Div $paddingTop="5px">
                                                <FlexRow>
                                                    <AdvancedDropdownLabel>
                                                        Hide like and view counts    
                                                    </AdvancedDropdownLabel>
                                                    <ToggleSwitch isChecked={props.isLikesDisabled} onChange={props.onDisableLikesChanged} />
                                                </FlexRow>
                                                <Text>
                                                    Only you will see the total number of likes and views on this post. You can change this later by going to the menu at the top of the post.  
                                                </Text>
                                            </Div>
                                            <Div $paddingTop="5px">
                                                <FlexRow>
                                                    <AdvancedDropdownLabel>
                                                        Turn off commenting
                                                    </AdvancedDropdownLabel>
                                                    <ToggleSwitch isChecked={props.isCommentsDisabled} onChange={props.onDisableCommentsChanged} />
                                                </FlexRow>
                                                <Text>
                                                    You can change this later by going to the menu at the top of the post.
                                                </Text>
                                            </Div>                                
                                        </FlexColumn>
                                    </Dropdown>
                                }                                     
                            </AdditionalControlsContainer>                            
                        </ControlContentContainer>
                    </ControlsContainer>
                </EditContainer>
            </ModalSectionWrapper>    
        </>
    )    
};

export default CreatePostModalFinal;