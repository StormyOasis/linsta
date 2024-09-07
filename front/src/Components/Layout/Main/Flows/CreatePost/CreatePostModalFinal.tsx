import React, { RefObject, SyntheticEvent, useEffect, useState } from "react";
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
import { getLocation } from "../../../../../api/ServiceController";

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
    background-color: ${props => props.theme['colors'].backgroundColor};
    border: 1px solid ${props => props.theme['colors'].borderDefaultColor};
    border-radius: 8px;
    overflow-y: auto;
    overflow-x: clip;
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

const LocationEntry = styled.div`
    padding: 8px;
    width: 100%;
    max-height: 36px;
    cursor: pointer;

    &:hover {
        background-color: ${props => props.theme['colors'].borderDefaultColor};
    }; 
`;

export type CreatePostModalFinalProps = {
    isCommentsDisabled: boolean;
    isLikesDisabled: boolean;
    editData: EditData[];
    onLexicalChange: (data: string) => void;
    onChange: (field: string, data: any) => void;
}

const CreatePostModalFinal: React.FC<CreatePostModalFinalProps> = (props: CreatePostModalFinalProps) => {
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [isFlaggedForReset, setIsFlaggedForReset] = useState(false);
    const [emoji, setEmoji] = useState(null);
    const [charCount, setCharCount] = useState(0);
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const [locationData, setLocationData] = useState<{Place: any, Relevance: number}[]>([]);
    const [locationText, setLocationText] = useState<string>("");
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
        setIsLocationOpen(false);
        setIsCollabOpen(false);  
        setLocationText("");      
        setCollabText("");
        setLocationData([]);
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

    const handleLocationClick = () => {
        setIsLocationOpen(true);
    }

    const handleSelectLocationClick = (event: SyntheticEvent, label: string) => {        
        event.stopPropagation();
        event.preventDefault();

        setIsLocationOpen(false);
        setLocationData([]);
        setLocationText(label);
    }    

    const handleLocationKeyUp = (e:React.KeyboardEvent<HTMLDivElement>) => {        
        if(e.key === "Escape") { // On escape key press, close the picker            
            setIsLocationOpen(false);
            return;
        }
    } 

    const handleLocationTextChange = async (e: React.ChangeEvent<HTMLInputElement>) => {                
        if(e.currentTarget.value === null || e.currentTarget.value.length === 0) {            
            setLocationText("");
            setLocationData([]);
            return;
        }
        setLocationText(e.currentTarget.value);

        const result = await getLocation(e.currentTarget.value);
        
        setLocationData(result.data);        
    }     
    
    const handleLocationClear = (e:React.SyntheticEvent<HTMLInputElement>) => {
        e.stopPropagation();
        e.preventDefault();

        setIsLocationOpen(false);
        setLocationData([]);
        setLocationText("");
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
    
    const renderLocationEntries = () => {
        if(locationData == null) {
            return <></>;
        }
        const entries:any[] = [];

        locationData.map(entry => {
            entries.push(
                <LocationEntry key={entries.length} onClick={(e) => handleSelectLocationClick(e, entry.Place.Label)}>
                    <span>
                        {entry.Place.Label}
                    </span>
                </LocationEntry>                        
            );
        });

        return entries;
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onChange("altInput", 
                            {
                                index: data.index,
                                value: e.currentTarget.value
                            })}
                            >                          
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
        <ModalSectionWrapper>
            <EditContainer>                 
                <ImageContainer>
                    {!data.isVideoFile && <PreviewImage src={data.editedUrl} />}
                    {data.isVideoFile && <video src={data.originalUrl}></video>}

                    {(currentFileIndex > 0) && 
                        <MediaSliderLeftWrapper>
                            <MediaSliderButton onClick={() => {handlePrevFile(); setIsFlaggedForReset(true)}}>
                                <LeftArrowSVG />
                            </MediaSliderButton>
                        </MediaSliderLeftWrapper>
                    }
                    {(currentFileIndex < props.editData.length-1) &&
                        <MediaSliderRightWrapper>
                            <MediaSliderButton onClick={() => {handleNextFile(); setIsFlaggedForReset(true)}}>
                                <RightArrowSVG />
                            </MediaSliderButton>
                        </MediaSliderRightWrapper>                                                    
                    }                    
                </ImageContainer>
                <ControlsContainer>
                    <div style={{fontWeight: 700, paddingBottom: "10px"}}>
                        {authUser.userName}
                    </div>                           
                    <ControlContentContainer>
                        <TextEditorContainerWrapper>
                            <TextEditorContainer>
                                <TextEditor onChange={props.onLexicalChange} 
                                    maxTextLength={MAX_TEXT_LENGTH} emoji={emoji} getCurrentLength={getCurrentLength} />                                
                            </TextEditorContainer>                                                         
                            <TextEditorBottomWrapper>
                                <span style={{flexBasis: "75%"}}>
                                    <EmojiPickerPopup onEmojiClick={handleEmojiSelect} />
                                </span>
                                <CharacterCountContainer>
                                    {charCount > (MAX_TEXT_LENGTH+1) ? 
                                        `${(MAX_TEXT_LENGTH+1)} / ${MAX_TEXT_LENGTH + 1}` : 
                                        `${charCount} / ${MAX_TEXT_LENGTH + 1}`}
                                </CharacterCountContainer>
                            </TextEditorBottomWrapper>
                        </TextEditorContainerWrapper>
                        <AdditionalControlsContainer>
                            <InputContainer>
                                <Label>
                                    <Input type="text" placeholder="Add Location" spellCheck={true} 
                                            aria-label="Add Location" aria-placeholder="Add Location"
                                            name="locationInput" value={locationText}
                                            onClick={handleLocationClick} 
                                            onKeyUp={handleLocationKeyUp}
                                            onChange={handleLocationTextChange}>
                                    </Input>
                                    <SVGContainer>
                                        {(locationText && locationText.length > 0) ?                                              
                                            <CircleXSVG style={{cursor: "pointer" }} onClick={handleLocationClear} /> :
                                            <LocationSVG />
                                        }                                        
                                    </SVGContainer>
                                    <LocationPopupContainer $isOpen={isLocationOpen}>
                                        <FlexColumn>
                                            {renderLocationEntries()}
                                        </FlexColumn>
                                    </LocationPopupContainer>
                                </Label>
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
                                    <div style={{paddingTop: "5px"}}>
                                        <FlexRow>
                                            <AdvancedDropdownLabel>
                                                Hide like and view counts    
                                            </AdvancedDropdownLabel>
                                            <ToggleSwitch isChecked={props.isLikesDisabled} onChange={(checked: boolean) => 
                                                props.onChange("hideLikes", {
                                                    index: null,
                                                    value: checked
                                                })} />
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
                                            <ToggleSwitch isChecked={props.isCommentsDisabled} onChange={(checked: boolean) => 
                                                props.onChange("turnOffComments", {
                                                    index: null,
                                                    value: checked
                                                })} />
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