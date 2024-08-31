import React, { RefObject, useState } from "react";
import styled from "styled-components";
import * as styles from '../../Main.module.css';
import { ModalSectionWrapper } from "../../../../../Components/Common/MultiStepModal";
import LeftArrowSVG from "/public/images/left_arrow.svg";
import RightArrowSVG from "/public/images/right_arrow.svg";
import { EditData } from "./CreatePostModal";
import ContentEditable from "react-contenteditable";
import sanitizeHtml from "sanitize-html";
import EmojiPickerPopup from "../../../../../Components/Common/EmojiPickerPopup";
import { AuthUser } from "../../../../../api/Auth";
import { useSelector } from "react-redux";
import { getCECursorPosition, setCEPosition, setCursorAtNodePosition, setCursorEditable } from "../../../../../utils/utils";


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
    height: 80%;
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

type State = {
    html: string;
    isFlaggedForReset: boolean;
    cursorPosition: number;
    pendingEmojiInsert: string|null;
};

/**
 * Note: This needs to be a class component due to a react-contenteeditable issue
 * See: https://github.com/lovasoa/react-contenteditable/issues/161
 */
class CreatePostModalFinalEntry extends React.Component<CreatePostModalFinalEntryProps, State> {
    contentEditable:React.RefObject<HTMLDivElement>;
    
    constructor(props:CreatePostModalFinalEntryProps) {
        super(props);
    
        this.contentEditable = React.createRef();
        this.state = {
            html: "",
            isFlaggedForReset: false,
            cursorPosition: 0,
            pendingEmojiInsert: null
        };

        document.addEventListener('selectionchange', this.handleSelectionChange);
    }  

    handleSelectionChange = () => {
        console.log("handle selectionchange")
        if (document.activeElement !== this.contentEditable.current) {
            return;
        }
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const clonedRange = range.cloneRange();
        clonedRange.selectNodeContents( this.contentEditable.current);
        clonedRange.setEnd(range.endContainer, range.endOffset);
        this.setState({cursorPosition: clonedRange.toString().length });
    };    
    
    setIsFlaggedForReset = (value: boolean) => {
        this.setState({isFlaggedForReset: value});
    }

    resetState = () => { 
        this.setState({isFlaggedForReset: false});
    }

    handleContentChange = (e: any) => {            
        this.setState({html: e.target.value});//, cursorPosition: getCECursorPosition(this.contentEditable.current)});
    }

    handleFocus = () => {
        console.log("focus", this.state.cursorPosition);
        //setCEPosition(this.contentEditable.current, this.state.cursorPosition);
        //setCursorAtNodePosition(this.contentEditable.current, this.state.cursorPosition);

        if(this.state.pendingEmojiInsert !== null) {
            document.execCommand("insertText", false, this.state.pendingEmojiInsert);
        }
    }

    sanitize = () => {
        this.setState({ html: sanitizeHtml(this.state.html, {
            allowedTags: ["b", "i", "em", "strong", "a", "p", "h1", "div", "span", "pre", "br", "img"],
            allowedAttributes: { 
                a: ["href", "style", "class"], 
                span: ['style', 'class'], 
                div:['style', 'class'],
                p:['style',  'class'],
                img:['src', 'alt']
            }
        }), cursorPosition: getCECursorPosition(this.contentEditable.current)});
    }

    handleEmojiSelect = (emoji: string) => {        

        
        this.setState({pendingEmojiInsert: emoji}, () => {
            //this.contentEditable?.current?.focus();
            setCEPosition(this.contentEditable?.current, this.state.cursorPosition);
        });

        //setCEPosition(this.contentEditable.current, this.state.cursorPosition);     
        //setCursorEditable(this.contentEditable.current, this.state.cursorPosition);        
        //setCEPosition(this.contentEditable.current, this.state.cursorPosition);        
        //document.execCommand("insertText", false, emoji);

        //this.sanitize();
    }

    override render() {
        if(this.state.isFlaggedForReset) {
            this.resetState();        
        } 

        return (
            <ModalSectionWrapper>
                <EditContainer>                 
                    <ImageContainer>
                        {!this.props.editData.isVideoFile &&  <PreviewImage src={this.props.editData.editedUrl} />}
                        {this.props.editData.isVideoFile && <video src={this.props.editData.originalUrl}></video>}

                        {this.props.hasPrev && 
                            <MediaSliderLeftWrapper>
                                <MediaSliderButton onClick={() => {this.props.onPrevFile(); this.setIsFlaggedForReset(true)}}>
                                    <LeftArrowSVG />
                                </MediaSliderButton>
                            </MediaSliderLeftWrapper>
                        }
                        {this.props.hasNext &&
                            <MediaSliderRightWrapper>
                                <MediaSliderButton onClick={() => {this.props.onNextFile(); this.setIsFlaggedForReset(true)}}>
                                    <RightArrowSVG />
                                </MediaSliderButton>
                            </MediaSliderRightWrapper>                                                    
                        }                    
                    </ImageContainer>
                    <ControlsContainer>
                        <div style={{fontWeight: 700, paddingBottom: "10px"}}>
                            {this.props.authUser.userName}
                        </div>                           
                        <ControlContentContainer>
                            <TextEditorContainerWrapper>
                                <TextEditorContainer>
                                    <ContentEditable 
                                        innerRef={this.contentEditable}                                     
                                        aria-placeholder="Write a message" 
                                        aria-label="Write a message"
                                        role="textbox" 
                                        spellCheck="true" 
                                        className={styles.contentEditable}
                                        tagName="div" 
                                        html={this.state.html} 
                                        onChange={this.handleContentChange} 
                                        onBlur={this.sanitize} 
                                        onFocus={this.handleFocus}
                                        />                                                                                         
                                </TextEditorContainer>                                                         
                                <EmojiPickerPopup onEmojiClick={this.handleEmojiSelect} />
                            </TextEditorContainerWrapper>                            
                        </ControlContentContainer>
                    </ControlsContainer>
                </EditContainer>
            </ModalSectionWrapper>    
        )
    }
};

export default CreatePostModalFinal;