import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { ModalSectionWrapper } from "../../../../Common/MultiStepModal";
import Slider from "../../../../Common/Slider";
import { EditData } from "./CreatePostModal";
import { Div, Flex, FlexColumn, FlexRow, FlexRowFullWidth } from "../../../../Common/CombinedStyling";
import { blobToBase64 } from "../../../../../utils/utils";
import MediaSliderButton from "../../../../Common/MediaSliderButton";

const EditContainer = styled(Flex)`
  width: 100%;
  flex-direction: column;

  @media (min-width: ${props => props.theme["breakpoints"].md - 1}px) {
    flex-direction: row;
    min-width: calc(${props => props.theme['sizes'].defaultModalWidth} - 40px);
    max-width: calc(${props => props.theme['sizes'].maxModalWidth} - 40px);
    max-height: 412px;
    min-height: calc(${props => props.theme['sizes'].minModalHeight} - 40px);
  }
`;

const ImageContainer = styled(Flex)`
  position: relative;
  width: 100%;
  justify-content: center;
  align-items: center;

  @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
    max-width: 100%;
    height: auto;
    flex: 0 0 auto;
    overflow: visible;
    width: 100vw;
  }
`;

const ControlsContainer = styled(FlexColumn)`
    padding-left: 5px;
    pointer-events: all;

    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {    
        padding: 10px 0 0 0;
        width: 100vw;
    }
`;

const ControlTabContainer = styled(FlexRowFullWidth)`
    height: max-content;
`;

const ControlTab = styled(Flex) <{ selected?: boolean }>`
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

const ControlContentContainer = styled(FlexColumn)`
    overflow-y: auto;
    overflow-x: hidden;
`;

const PreviewImage = styled.img`
    width: 100%;
    height: auto;
    object-fit: contain;
    max-width: 100%;
    max-height: 400px;
    display: block;

    @media (min-width: ${props => props.theme["breakpoints"].md}px) {
        width: 386px;
        height: 412px;
        object-fit: cover;
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
        max-height: 400px;
        object-fit: contain;
    }    
`;

const FilterTile = styled(FlexColumn)`
    cursor: pointer;
    align-items: center;

    @media (max-width: ${props => props.theme["breakpoints"].lg - 1}px) {
        flex: 0 0 auto;
        width: 80px;
    }    
`;

const FilterImage = styled.img`
    margin-bottom: 3px;
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover; 
`;

const FilterText = styled(Div) <{ selected?: boolean }>`
    text-align: center;
    font-weight: ${props => props.selected ? 700 : 400};
    text-transform: capitalize;
    font-size: 12px;
`;

const Grid = styled(Div)`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  @media (min-width: ${props => props.theme["breakpoints"].lg}px) and 
    (max-width: ${props => props.theme["breakpoints"].xl - 1}px) {
    grid-template-columns: repeat(2, 1fr);
  } 

  @media (max-width: ${props => props.theme["breakpoints"].lg - 1}px) {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    max-width: 100vw;
    width: 100%;
    box-sizing: border-box;

    > * {
      flex: 0 0 auto;
    }

    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }     
`;

const ScrollContainer = styled.div`
  overflow-x: auto;
  width: 100%;
  max-width: 100vw;

  @media (min-width: ${props => props.theme["breakpoints"].lg}px) {
    overflow-x: unset;
  }
`;

export type CreatePostModalEditProps = {
    editData: EditData[];
    onEditedFile: (editData: EditData, data: string, newFilter: string) => void;
    loadImage: (editData: EditData, data: string) => string;
}

const CreatePostModalEdit: React.FC<CreatePostModalEditProps> = (props: CreatePostModalEditProps) => {
    const [currentFileIndex, setCurrentFileIndex] = useState(0);

    const onNextFile = () => {
        setCurrentFileIndex(currentFileIndex + 1);
    }

    const onPrevFile = () => {
        setCurrentFileIndex(currentFileIndex - 1);
    }

    if (props.editData == null || props.editData.length === 0) {
        return null;
    }

    return (
        <>
            <CreatePostModalEditor
                hasNext={currentFileIndex < props.editData.length - 1}
                hasPrev={currentFileIndex > 0}
                onNextFile={onNextFile}
                onPrevFile={onPrevFile}
                editData={props.editData[currentFileIndex]}
                onEditedFile={props.onEditedFile}
                loadImage={props.loadImage}
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
    onEditedFile: (editData: EditData, data: string, newFilter: string) => void;
    loadImage: (editData: EditData, data: string) => string;
}

const CreatePostModalEditor: React.FC<CreatePostModalEditorProps> = (props: CreatePostModalEditorProps) => {
    const [isFlaggedForReset, setIsFlaggedForReset] = useState(false);
    const [controlTabIndex, setControlTabIndex] = useState(0);
    const [brightness, setBrightness] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [greyscale, setGreyscale] = useState(0);
    const [invert, setInvert] = useState(0);
    const [blur, setBlur] = useState(0);
    const [sepia, setSepia] = useState(0);
    const [pixelate, setPixelate] = useState(0);
    const [jimpWorker, setJimpWorker] = useState<Worker | null>(null); //WebWorker

    const imageRef = React.useRef();

    useEffect(() => {
        // Some of the image manipulations are expensive, so offload all 
        // image manipulations onto a web worker to keep the main thread responsive
        if (jimpWorker !== null) {
            jimpWorker.terminate();
        }
        const worker = new Worker("/public/jimpWorker.js");

        worker.onmessage = (e) => {
            const data = e.data;

            props.onEditedFile(props.editData, data.data, props.editData.filterName);
        }

        worker.onerror = (e) => {
            console.error(e);
        }

        setJimpWorker(worker);

        return () => worker.terminate();
    }, [props.editData])

    const onFilterClick = async (filterName: string) => {
        if (filterName === "original" || filterName === props.editData.filterName) {
            //reset when clicking the original filter or the current filter to toggle
            props.onEditedFile(props.editData, await blobToBase64(props.editData.originalUrl) as string, "original");
            return;
        }

        // Have to reload the image element or we end up compounding filters. 
        // We instead should simulate resetting back to the original image before applying
        // the filter
        const image: HTMLImageElement = new Image();
        image.src = props.editData.originalUrl;
        image.onload = async () => {
            const result = await window.pixelsJS.default.filterImgAsBlob(image, filterName);
            props.onEditedFile(props.editData, await blobToBase64(result) as string, filterName);
        }
    }

    const resetState = () => {
        setBrightness(0);
        setContrast(0);
        setGreyscale(0);
        setInvert(0);
        setBlur(0);
        setSepia(0);
        setPixelate(0);
        setIsFlaggedForReset(false);
    }

    const renderFiltersTab = () => {
        const filters = window.pixelsJS.getFilterNames();
        const selectedFilter = props.editData.filterName;

        return (
            <>
                <FlexColumn>
                    <ScrollContainer>
                        <Grid>
                            <FilterTile key="original" onClick={() => onFilterClick("original")}>
                                <FilterImage src={`/public/images/filters/original.png`} alt="Original" />
                                <FilterText selected={selectedFilter === "original"}>original</FilterText>
                            </FilterTile>
                            {Object.keys(filters).map(key => {
                                return (
                                    <FilterTile key={key} onClick={() => onFilterClick(key)}>
                                        <FilterImage src={`/public/images/filters/${key}.jfif`} alt={key} />
                                        <FilterText selected={selectedFilter === key}>{key.replaceAll("_", " ")}</FilterText>
                                    </FilterTile>
                                );
                            })
                            }
                        </Grid>
                    </ScrollContainer>
                </FlexColumn>
            </>
        );
    }

    const renderAdjustmentsTab = () => {
        return (
            <>
                <Slider
                    value={brightness}
                    min={-1}
                    max={1}
                    step={0.1}
                    label="Brightness"
                    aria-labelledby="Brightness"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value: number = Number.parseFloat(e.target.value);
                        setBrightness(value);

                        if (jimpWorker) {
                            jimpWorker.postMessage({
                                data: props.editData.data,
                                type: "brightness",
                                value
                            });
                        }
                    }}
                />
                <Slider
                    value={contrast}
                    min={-1}
                    max={1}
                    step={0.1}
                    label="Contrast"
                    aria-labelledby="Contrast"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value: number = Number.parseFloat(e.target.value);
                        setContrast(value);

                        if (jimpWorker) {
                            jimpWorker.postMessage({
                                data: props.editData.data,
                                type: "contrast",
                                value
                            });
                        }
                    }}
                />
                <Slider
                    value={greyscale}
                    min={0}
                    max={1}
                    step={1}
                    label="Greyscale"
                    aria-labelledby="Greyscale"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value: number = Number.parseFloat(e.target.value);
                        setGreyscale(value);

                        if (jimpWorker) {
                            jimpWorker.postMessage({
                                data: props.editData.data,
                                type: "greyscale",
                                value
                            });
                        }
                    }}
                />
                <Slider
                    value={invert}
                    min={0}
                    max={1}
                    step={1}
                    label="Invert"
                    aria-labelledby="Invert"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value: number = Number.parseFloat(e.target.value);
                        setInvert(value);

                        if (jimpWorker) {
                            jimpWorker.postMessage({
                                data: props.editData.data,
                                type: "invert",
                                value
                            });
                        }
                    }}
                />
                <Slider
                    value={blur}
                    min={0}
                    max={50}
                    step={1}
                    label="Blur"
                    aria-labelledby="Blur"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value: number = Number.parseFloat(e.target.value);
                        setBlur(value);

                        if (jimpWorker) {
                            jimpWorker.postMessage({
                                data: props.editData.data,
                                type: "blur",
                                value
                            });
                        }
                    }}
                />
                <Slider
                    value={sepia}
                    min={0}
                    max={1}
                    step={1}
                    label="Sepia"
                    aria-labelledby="Sepia"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value: number = Number.parseFloat(e.target.value);
                        setSepia(value);

                        if (jimpWorker) {
                            jimpWorker.postMessage({
                                data: props.editData.data,
                                type: "sepia",
                                value
                            });
                        }
                    }}
                />
                <Slider
                    value={pixelate}
                    min={0}
                    max={100}
                    step={1}
                    label="Pixelate"
                    aria-labelledby="Pixelate"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value: number = Number.parseFloat(e.target.value);
                        setPixelate(value);

                        if (jimpWorker) {
                            jimpWorker.postMessage({
                                data: props.editData.data,
                                type: "pixelate",
                                value
                            });
                        }
                    }}
                />
            </>
        );
    }

    if (isFlaggedForReset) {
        resetState();
    }

    return (
        <ModalSectionWrapper>
            <EditContainer>
                <ImageContainer>
                    {!props.editData.isVideoFile &&
                        <PreviewImage ref={imageRef} src={props.loadImage(props.editData, props.editData.data)} />}
                    {props.editData.isVideoFile && <PreviewVideo src={props.editData.originalUrl}></PreviewVideo>}

                    {props.hasPrev &&
                        <MediaSliderButton direction="left" onClick={() => { props.onPrevFile(); setIsFlaggedForReset(true) }} />
                    }
                    {props.hasNext &&
                        <MediaSliderButton direction="right" onClick={() => { props.onNextFile(); setIsFlaggedForReset(true) }} />
                    }
                </ImageContainer>
                <ControlsContainer>
                    {props.editData.isVideoFile &&
                        <Div $fontWeight="700" $color="red" $textAlign="center">Note: Editing video files is currently unsupported</Div>
                    }
                    {!props.editData.isVideoFile &&
                        <>
                            <ControlTabContainer>
                                <ControlTab
                                    selected={controlTabIndex === 0}
                                    onClick={() => {
                                        setIsFlaggedForReset(true);
                                        setControlTabIndex(0)
                                    }}>Filters</ControlTab>
                                <ControlTab
                                    selected={controlTabIndex === 1}
                                    onClick={() => {
                                        setIsFlaggedForReset(true);
                                        setControlTabIndex(1);
                                    }}>Adjustments</ControlTab>
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