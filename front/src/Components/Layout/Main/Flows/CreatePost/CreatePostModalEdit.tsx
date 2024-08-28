import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { isVideoFileFromType } from "../../../../../utils/utils";
import { ModalSectionWrapper } from "../../../../../Components/Common/MultiStepModal";
import LeftArrowSVG from "/public/images/left_arrow.svg";
import RightArrowSVG from "/public/images/right_arrow.svg";

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
    width: 54%;
    justify-content: flex-end;
    vertical-align: middle;
`;

const ControlsContainer = styled.div`
    display: flex;    
    flex-direction: column;
    width: 46%;  
    padding-left: 5px;
    pointer-events: all;
`;

const ControlTabContainer = styled.div`
    display:flex;
    flex-direction: row;
    width: 100%;
    height: max-content;
`;

const ControlTab = styled.div<{selected?: boolean}>`
    display: flex;
    cursor: pointer;
    opacity: ${props => props.selected ? 1 : .25};
    font-weight: ${props => props.selected ? 700 : 500};
    padding: 10px 0;
    border-bottom: 1px solid ${props => props.theme['colors'].borderDarkColor};
    justify-content: center;
    flex-basis: 0;
    flex-grow: 1;
    flex-shrink: 1;
    height: max-content;
`;

const ControlContentContainer = styled.div`
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    overflow-x: hidden;
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

const FilterList = styled.div`
    display: flex;
    flex-direction: column;
`;

const FilterTile = styled.div`
    display: flex;
    cursor: pointer;
    align-items: center;
`;

const FilterImage = styled.img`
    width: 25%;
    margin-bottom: 3px;
`;

const FilterText = styled.div<{selected?: boolean}>`
    text-align: center;
    font-weight: ${props => props.selected ? 700 : 400};
    margin-left: 10px;
`;

export type EditData = {
    isVideoFile: boolean;
    index: number;
    originalUrl: string;
    editedUrl: string;
    filterName: string;
}

export type CreatePostModalEditProps = {
    editData: EditData[];
    onEditedFile: (editData: EditData, newUrl: string, newFilter: string) => void;   
}

const CreatePostModalEdit: React.FC<CreatePostModalEditProps> = (props: CreatePostModalEditProps) => {
    const [currentFileIndex, setCurrentFileIndex] = useState(0);

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
            <CreatePostModalEditor 
                hasNext={currentFileIndex < props.editData.length-1}
                hasPrev={currentFileIndex > 0}
                onNextFile={onNextFile}
                onPrevFile={onPrevFile}
                editData={props.editData[currentFileIndex]}
                onEditedFile={props.onEditedFile}
            />
        </>
    );
};

type CreatePostModalEditorProps = {
    editData: EditData;
    hasNext: boolean;
    hasPrev: boolean;
    onNextFile: () => void;
    onPrevFile: () => void;    
    onEditedFile: (editData:EditData, newUrl:string, newFilter: string) => void;
}

const CreatePostModalEditor: React.FC<CreatePostModalEditorProps> = (props: CreatePostModalEditorProps) => {
    const [isFlaggedForReset, setIsFlaggedForReset] = useState(false);
    const [controlTabIndex, setControlTabIndex] = useState(0);    

    const imageRef = useRef(null);

    const onFilterClick = async (filterName: string) => {
        if(filterName === "original" || filterName === props.editData.filterName) {
            //reset when clicking the original filter or the current filter to toggle
            props.onEditedFile(props.editData, props.editData.originalUrl, "original");
            return;
        }        

        // Have to reload the image element or we end up compounding filters. 
        // We instead should simulate resetting back to the original image before applying
        // the filter
        const image:HTMLImageElement = new Image();
        image.src = props.editData.originalUrl;
        image.onload = async () => {            
            const result = await window.pixelsJS.default.filterImg(image, filterName, true);            
  
            //console.log(props.editData.editedUrl, props.editData.originalUrl, result);
            props.onEditedFile(props.editData, result, filterName);
        }
    }

    const resetStateToProps = () => {  
        setControlTabIndex(0); 
        setIsFlaggedForReset(false);    
    }

    const renderFiltersTab = () => {
        const filters = window.pixelsJS.getFilterNames();
        const selectedFilter = props.editData.filterName;

        return (
            <>
                <FilterList>
                    <FilterTile key="original" onClick={() => onFilterClick("original")}>
                        <FilterImage src={`/public/images/filters/original.png`} alt="Original" />
                        <FilterText selected={selectedFilter==="original"}>original</FilterText>
                    </FilterTile>                    
                    {Object.keys(filters)
                        // these 2 are listed but aren't implemented in the library
                        .filter((filterName) => filterName !== "horizon" && filterName !== "a" )
                        .map(key => {
                            return (
                                <FilterTile key={key} onClick={() => onFilterClick(key)}>
                                    <FilterImage src={`/public/images/filters/${key}.jfif`} alt={key} />
                                    <FilterText selected={selectedFilter === key}>{key}</FilterText>
                                </FilterTile>
                            );
                        })
                    }
                </FilterList>
            </>
        );
    }

    const renderAdjustmentsTab = () => {
        return (
            <>
            </>
        );
    }    

    if(isFlaggedForReset) {
        resetStateToProps();        
    }   
    
    return (
        <ModalSectionWrapper>
            <EditContainer>
                <ImageContainer>
                    {!props.editData.isVideoFile && <PreviewImage src={props.editData.editedUrl} ref={imageRef} />}
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
                {props.editData.isVideoFile && 
                    <div style={{fontWeight: 700, color: "red", textAlign: "center"}}>Note: Editing video files is currently unsupported</div>
                }
                {!props.editData.isVideoFile && 
                    <>
                        <ControlTabContainer>
                            <ControlTab 
                                selected={controlTabIndex === 0} 
                                onClick={() => setControlTabIndex(0)}>Filters</ControlTab>
                            <ControlTab 
                                selected={controlTabIndex === 1} 
                                onClick={() => setControlTabIndex(1)}>Adjustments</ControlTab>
                        </ControlTabContainer>
                        <ControlContentContainer>
                            {controlTabIndex === 0 && renderFiltersTab()}
                            {controlTabIndex === 1 && renderAdjustmentsTab()}
                        </ControlContentContainer>                      
                    </>                    
                }
                </ControlsContainer>
            </EditContainer>
        </ModalSectionWrapper>
    );
}

export default CreatePostModalEdit;