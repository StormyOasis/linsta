import React, { RefObject, useEffect, useState } from "react";
import styled from "styled-components";
import * as styles from '../../Main.module.css';
import { ModalSectionWrapper } from "../../../../../Components/Common/MultiStepModal";
import LeftArrowSVG from "/public/images/left_arrow.svg";
import RightArrowSVG from "/public/images/right_arrow.svg";
import LocationSVG from "/public/images/location.svg";
import CircleXSVG from "/public/images/x-circle.svg";
import CollabSVG from "/public/images/image-user-plus.svg";
import { EditData } from "./CreatePostModal";
import EmojiPickerPopup from "../../../../../Components/Common/EmojiPickerPopup";
import { AuthUser } from "../../../../../api/Auth";
import { useSelector } from "react-redux";
import TextEditor from "../../../../Common/Lexical/TextEditor";
import Dropdown from "../../../../../Components/Common/Dropdown";
import ToggleSwitch from "../../../../../Components/Common/ToggleSwitch";
import { FlexColumn, FlexRow } from "../../../../../Components/Common/CombinedStyling";

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

const MediaSliderLeftWrapper = styled.div`
    z-index: 20;
    position: absolute;
    bottom: 43%;
    left: -3%;
`;

const MediaSliderRightWrapper = styled.div`
    z-index: 20;
    position: absolute;
    bottom: 43%;
    right: 51%;
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

const LocationPopupContainer = styled.div<{$isOpen: boolean}>`
    display: ${props => props.$isOpen ? "flex" : "none"};
    position: fixed;
    top: 10px;
    width: 20%;
    height: 50%;
    z-index: 9;
`;

const CollabPopupContainer = styled.div<{$isOpen: boolean}>`
    display: ${props => props.$isOpen ? "flex" : "none"};
    position: fixed;
    top: 10px;
    width: 20%;
    height: 50%;
    z-index: 9;
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
    background-image: url('${props => props.$editData.editedUrl}');
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
    editData: EditData[];
    onLexicalChange: (data: string) => void;
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
                onLexicalChange={props.onLexicalChange}
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
    onLexicalChange: (data: any) => void;
};

const CreatePostModalFinalEntry: React.FC<CreatePostModalFinalEntryProps> = (props:CreatePostModalFinalEntryProps) => {
    const [isFlaggedForReset, setIsFlaggedForReset] = useState(false);
    const [emoji, setEmoji] = useState(null);
    const [charCount, setCharCount] = useState(0);
    const [delCount, setDelCount] = useState(MAX_TEXT_LENGTH+1); //TODO: Is this necessary?
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const [locationData, setLocationData] = useState(null);
    const [isCollabOpen, setIsCollabOpen] = useState(false);
    const [collabData, setCollabData] = useState(null);

    const resetState = () => { 
        setIsFlaggedForReset(false);
        setCharCount(0);
        setDelCount(MAX_TEXT_LENGTH+1);
        setEmoji(null);
        setIsLocationOpen(false);
        setIsCollabOpen(false);
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

    const handleLocationClick = (data: any, _event: MouseEvent) => {        
        setIsLocationOpen(false);
    }

    const handleLocationKeyUp = (e:React.KeyboardEvent<HTMLDivElement>) => {
        if(e.key === "Escape") { // On escape key press, close the picker
            setIsLocationOpen(false);
        }
    } 
    
    const handleLocationClear = () => {
        setIsLocationOpen(false);
        setLocationData(null);
    }

    const handleCollabClick = (data: any, _event: MouseEvent) => {        
        setIsLocationOpen(false);
        setIsCollabOpen(true);
    }

    const handleCollabKeyUp = (e:React.KeyboardEvent<HTMLDivElement>) => {
        if(e.key === "Escape") { // On escape key press, close the picker
            setIsCollabOpen(false);
        }
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
                                <TextEditor onChange={props.onLexicalChange} maxTextLength={MAX_TEXT_LENGTH} emoji={emoji} getCurrentLength={getCurrentLength} />                                
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
                        <AdditionalControlsContainer>
                            <InputContainer>
                                <Label>
                                    <Input type="text" placeholder="Add Location" spellCheck={true} 
                                            aria-label="Add Location" aria-placeholder="Add Location"
                                            name="locationInput">                                            
                                    </Input>
                                    <SVGContainer>
                                        {locationData === null ? 
                                            <LocationSVG /> : 
                                            <CircleXSVG style={{cursor: "pointer" }} onClick={handleLocationClear} /> }
                                        <LocationPopupContainer $isOpen={isLocationOpen} onKeyUp={handleLocationKeyUp}  />
                                    </SVGContainer>
                                </Label>
                            </InputContainer>
                            <InputContainer>
                                <Label>
                                    <Input type="text" placeholder="Add Collaborators" spellCheck={true} 
                                            aria-label="Add Collaborators" aria-placeholder="Add Collaborators"
                                            name="collabInput">                                            
                                    </Input>
                                    <SVGContainer>
                                        <CollabSVG />
                                        <CollabPopupContainer $isOpen={isCollabOpen} onKeyUp={handleCollabKeyUp}  />
                                    </SVGContainer>
                                </Label>
                            </InputContainer>        
                            <Dropdown title="Accessibility">
                                <div>
                                    <Text>
                                        Alt text describes your photos and videos for people with visual impairments.
                                    </Text>
                                    <FlexRow>
                                        {!props.editData.isVideoFile && 
                                            <AltImage 
                                                aria-label="Current image" 
                                                aria-placeholder="Current image"
                                                $editData={props.editData} />
                                        }
                                        {props.editData.isVideoFile && 
                                            <AltVideo 
                                                aria-label="Current video" 
                                                aria-placeholder="Current video"
                                                src={props.editData.originalUrl} />                                        
                                        }
                                        <Label style={{width: "100%"}}>
                                            <AltInput type="text" placeholder="Add Alt Text" spellCheck={true} 
                                                    aria-label="Add Alt Text" aria-placeholder="Add Alt Text"
                                                    name="altInput">                                            
                                            </AltInput>
                                        </Label>
                                    </FlexRow>
                                </div>
                            </Dropdown>
                            <Dropdown title="Advanced Settings">
                                <FlexColumn>
                                    <div style={{paddingTop: "5px"}}>
                                        <FlexRow>
                                            <AdvancedDropdownLabel>
                                                Hide like and view counts    
                                            </AdvancedDropdownLabel>
                                            <ToggleSwitch />
                                        </FlexRow>
                                        <Text>
                                            Only you will see the total number of likes and views on this post. You can change this later by going to the menu at the top of the post.  
                                        </Text>
                                    </div>
                                    <div style={{paddingTop: "5px"}}>
                                        <FlexRow>
                                            <AdvancedDropdownLabel>
                                                Turn off commenting
                                            </AdvancedDropdownLabel>
                                            <ToggleSwitch />
                                        </FlexRow>
                                        <Text>
                                            You can change this later by going to the menu at the top of the post.
                                        </Text>
                                    </div>                                
                                </FlexColumn>
                            </Dropdown>                                           
                        </AdditionalControlsContainer>                            
                    </ControlContentContainer>
                </ControlsContainer>
            </EditContainer>
        </ModalSectionWrapper>    
    )    
};

export default CreatePostModalFinal;