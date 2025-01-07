import React, { SyntheticEvent, useState } from "react";
import styled from "styled-components";
import * as styles from '../../Main.module.css';
import { ModalSectionWrapper } from "../../../../Common/MultiStepModal";

import CircleXSVG from "/public/images/x-circle.svg";
import CollabSVG from "/public/images/image-user-plus.svg";
import { EditData } from "./CreatePostModal";
import EmojiPickerPopup from "../../../../Common/EmojiPickerPopup";
import { AuthUser } from "../../../../../api/Auth";
import { useSelector } from "react-redux";
import TextEditor from "../../../../Common/Lexical/TextEditor";
import Dropdown from "../../../../Common/Dropdown";
import ToggleSwitch from "../../../../Common/ToggleSwitch";
import { Div, FlexColumn, FlexRow, Span } from "../../../../Common/CombinedStyling";
import LocationPopup from "../../../../Common/LocationPopup";
import MediaSliderButton from "../../../../Common/MediaSliderButton";

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
    overflow-x: hidden;
    overflow-y: auto;
`;

const PreviewImage = styled.img`
    display:flex;
    max-height: 100%;
`;

const TextEditorContainerWrapper = styled.div`
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
    color: ${props => props.theme['colors'].mediumTextColor};
    font-size: .9em;
`;

const AdditionalControlsContainer = styled.div`
    padding-right: 5px;
`;

const InputContainer = styled.div`
    margin-top: 10px;
`;

const SVGContainer = styled.div`
    width: 24px;
    height: 24px;
    margin: auto;
    align-content: center;
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

const CollabPopupContainer = styled.div<{$isOpen: boolean}>`
    display: ${props => props.$isOpen ? "flex" : "none"};
    position: fixed;
    top: 10px;
    width: 20%;
    height: 50%;
    z-index: 9;
    background-color: ${props => props.theme['colors'].backgroundColor};
    border: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 8px;
    overflow-y: auto;
    overflow-x: clip;    
`;

const Text = styled.div`
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

const AltImage = styled.div<{$editData:EditData}>`
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
    locationText?: string;
    isCommentsDisabled: boolean;
    isLikesDisabled: boolean;
    hasErrorOccured: boolean;
    editData: EditData[];
    onLexicalChange: (data: string, charCount: number) => void;
    onDisableCommentsChanged: (value: boolean) => void;
    onDisableLikesChanged: (value: boolean) => void;
    onLocationChanged: (value: string) => void;
    onAltImageChanged: (index: number, value: string) => void;
}

const CreatePostModalFinal: React.FC<CreatePostModalFinalProps> = (props: CreatePostModalFinalProps) => {
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [isFlaggedForReset, setIsFlaggedForReset] = useState(false);
    const [emoji, setEmoji] = useState(null);
    const [charCount, setCharCount] = useState(0);
    const [collabText, setCollabText] = useState<string>("");
    const [isCollabOpen, setIsCollabOpen] = useState(false);
    const [collabData, setCollabData] = useState(null);

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
        setIsCollabOpen(false);             
        setCollabText("");
        setCollabData(null);
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

    const handleCollabTextChange = async (e: React.ChangeEvent<HTMLInputElement>) => {        
        if(e.currentTarget.value === null || e.currentTarget.value.length === 0) {
            setCollabData(null);
            setCollabText("");
            return;
        }
    
        setCollabText(e.currentTarget.value);
    }       

    const handleCollabClick = () => {
        setIsCollabOpen(true);
    }

    const handleCollabKeyUp = (e:React.KeyboardEvent<HTMLDivElement>) => {
        if(e.key === "Escape") { // On escape key press, close the picker
            setIsCollabOpen(false);
        }
    }

    const handleCollabClear = (e:React.SyntheticEvent<HTMLInputElement>) => {
        e.stopPropagation();
        e.preventDefault();
        
        setIsCollabOpen(false);
        setCollabData(null);
        setCollabText("");
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
                        {data.isVideoFile && <video src={data.originalUrl}></video>}

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
                                    <TextEditor onChange={handleLexicalChange} 
                                        maxTextLength={MAX_TEXT_LENGTH} emoji={emoji} getCurrentLength={getCurrentLength} />                                
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
                                    <Label>
                                        <Input type="text" placeholder="Add Collaborators" spellCheck={true} 
                                                aria-label="Add Collaborators" aria-placeholder="Add Collaborators"
                                                name="collabInput" value={collabText}                                       
                                                onClick={handleCollabClick} 
                                                onKeyUp={handleCollabKeyUp}
                                                onChange={handleCollabTextChange}>                                            
                                        </Input>
                                        <SVGContainer>
                                            {(collabText && collabText.length > 0) ?                                              
                                                <CircleXSVG style={{cursor: "pointer" }} onClick={handleCollabClear} /> :
                                                <CollabSVG />
                                            }                              
                                        </SVGContainer>
                                        <CollabPopupContainer $isOpen={isCollabOpen}>
                                            <FlexColumn>
                                                collab stuff here
                                            </FlexColumn>                                    
                                        </CollabPopupContainer>
                                    </Label>
                                </InputContainer>        
                                <Dropdown title="Accessibility">
                                    <div>
                                        <Text>
                                            Alt text describes your photos and videos for people with visual impairments.
                                        </Text>
                                        {renderAltImages()}
                                    </div>
                                </Dropdown>
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
                            </AdditionalControlsContainer>                            
                        </ControlContentContainer>
                    </ControlsContainer>
                </EditContainer>
            </ModalSectionWrapper>    
        </>
    )    
};

export default CreatePostModalFinal;