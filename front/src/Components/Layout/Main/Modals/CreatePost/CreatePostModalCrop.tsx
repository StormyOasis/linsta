import React, { useState } from "react";
import styled from "styled-components";
import Cropper, { Area, Point } from 'react-easy-crop';
import { isVideoFileFromType } from "../../../../../utils/utils";
import { ModalSectionWrapper } from "../../../../Common/MultiStepModal";
import Slider from "../../../../Common/Slider";
import { Div, Flex } from "../../../../Common/CombinedStyling";
import MediaSliderButton from "../../../../Common/MediaSliderButton";
import { CropSVG, FourToFiveSVG, ImageSVG, OneToOneSVG, SixteenToNineSVG } from "../../../../../Components/Common/Icon";

const CropContainer = styled(Div)`
    height: ${props => props.theme['sizes'].cropperHeight};
    width: calc(${props => props.theme['sizes'].defaultModalWidth} - 40px);
    max-width: calc(${props => props.theme['sizes'].maxModalWidth} - 40px);
`;

const CropperWrapper = styled(Div)`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
`;
const CropperContainer = styled(Div)`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 5px;
`;

const CropperAspectRatioButtonWrapper = styled(Div)`
    z-index: 20;
    position: absolute;
    bottom: 0;
`;

const CropperAspectRatioButton = styled(Div)<{$isopen?: string}>`
    width: 24px;
    height: 24px;
    color: ${props => props.$isopen === "true" ? props.theme['colors'].cropperAspectBkgnd : "white"};
    background-color: ${props => props.$isopen === "true" ? "white" : props.theme['colors'].cropperAspectBkgnd};
    border-radius: 50%;
    padding: 5px; 
    cursor: pointer;
    margin-left: 5px;
    margin-bottom: 10px;

    &:hover {
        color: ${props => props.theme['colors'].borderDefaultColor};
        background-color: ${props => props.theme['colors'].cropperAspectBkgndNoTrans};
    };    
`;

const AspectPopupMenu = styled(Div)`
    z-index: 20;
    position:absolute;
    bottom: 50px;
    left: 10px;
    background-color: ${props => props.theme['colors'].cropperAspectBkgnd};    
    cursor: pointer;
    display: flex;
    flex-direction: column;  
    border-radius: 8px;
    overflow: hidden;
    width: 95px;
`;

const AspectPopupMenuItem = styled(Div)<{selected?: boolean}>`
    padding: 5px;
    border-top: 1px solid ${props => props.theme['colors'].borderDarkColor};    
    color: ${props => props.selected ? "white" : props.theme['colors'].borderDarkColor};
    font-weight: ${props => props.selected ? 700 : 400};
    display: flex;

    &:nth-child(1) {
        border: none;
    };      

    &:hover {
        color: ${props => props.theme['colors'].borderDefaultColor};
        background-color: ${props => props.theme['colors'].cropperAspectBkgndNoTrans};
    };
`;

const AspectPopupMenuItemContent = styled(Div)`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
`;

export type CreatePostModalCropProps = {
    files: any[];
    cropData: CropData[];
    setCropData: (cropData: CropData[]) => void;
}

type AspectRatio = {
    value: number;
    text: string;
    icon: any|null;
}

const aspectRatios:AspectRatio[] = [
    { value: 0, text: "Original", icon: {element: <ImageSVG width="22px" height="22px" stroke="none" />}},
    { value: 1 / 1, text: "1:1", icon: {element: <OneToOneSVG width="22px" height="22px"/>}},
    { value: 1 / 2, text: "1:2", icon: null },    
    { value: 4 / 3, text: "4:3", icon: null },
    { value: 4 / 5, text: "4:5", icon: {element: <FourToFiveSVG width="16px" height="22px" />}},
    { value: 16 / 9, text: "16:9", icon: {element: <SixteenToNineSVG width="22px" height="16px"/>}},    
];

export type CropData = {
    crop: Point;
    zoom: number;
    rotation: number;
    aspect: AspectRatio;
    croppedAreaPixels: Area|null;
};

type CropperProps = {
    file: any;
    cropData: CropData;
    hasNext: boolean;
    hasPrev: boolean;
    isVideoFile: boolean;
    onNextFile: () => void;
    onPrevFile: () => void;
    onCropComplete: (
        crop: Point, zoom: number, rotation: number, 
        aspect: AspectRatio, croppedAreaPixels: Area) => void;
};

export const defaultCropData = (count: number):CropData[] => {
   const cropDataList:CropData[] = [];
   for(let i = 0; i < count; i++) {
        cropDataList.push({
            crop: {x: 0, y: 0},
            zoom: 1,
            rotation: 0,
            aspect: aspectRatios[0],
            croppedAreaPixels: null            
        });
   }

   return cropDataList;
}

const CreatePostModalCrop: React.FC<CreatePostModalCropProps> = (props: CreatePostModalCropProps) => {
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
        
    const onNextFile = () => {
        setCurrentFileIndex(currentFileIndex + 1);
    }

    const onPrevFile = () => {
        setCurrentFileIndex(currentFileIndex - 1);
    }

    const onCropComplete = (
        crop: Point, zoom: number, rotation: number, 
        aspect: AspectRatio, croppedAreaPixels: Area) => {

        const newCropData = [...props.cropData];
        newCropData[currentFileIndex] = {
            crop,
            zoom,
            rotation,
            aspect,
            croppedAreaPixels
        }

        props.setCropData(newCropData);
    }

    if(props.files == null || props.files.length === 0) {
        return null;
    }

    const isVideoFile = isVideoFileFromType(props.files[currentFileIndex].type);

    return (
        <>
            {isVideoFile && <Div $fontWeight="700" $color="red" $textAlign="center">Note: Editing video files is currently unsupported</Div>}
            <CreatePostModalCropper 
                isVideoFile={isVideoFile}
                hasNext={currentFileIndex < props.files.length-1}
                hasPrev={currentFileIndex > 0}
                onNextFile={onNextFile}
                onPrevFile={onPrevFile}
                onCropComplete={onCropComplete}
                file={props.files[currentFileIndex]} 
                cropData={props.cropData[currentFileIndex]}
            />
        </>
    );
}

const CreatePostModalCropper: React.FC<CropperProps> = (props: CropperProps) => {
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(1);
    const [crop, setCrop] = useState<Point>(props.cropData.crop);
    const [zoom, setZoom] = useState(props.cropData.zoom);    
    const [rotation, setRotation] = useState(props.cropData.rotation);
    const [aspect, setAspect] = useState(props.cropData.aspect);    
    const [_croppedAreaPixels, setCroppedAreaPixels] = useState<Area|null>(props.cropData.croppedAreaPixels);
    const [isAspectMenuOpen, setIsAspectMenuOpen] = useState(false);
    const [isFlaggedForReset, setIsFlaggedForReset] = useState(false);

    const resetStateToProps = () => {
        setCrop(props.cropData.crop);
        setZoom(props.cropData.zoom);
        setRotation(props.cropData.rotation);
        setAspect(props.cropData.aspect);
        setCroppedAreaPixels(props.cropData.croppedAreaPixels);
        setIsAspectMenuOpen(false);
        
        setIsFlaggedForReset(false);
    }

    const getImageDimensions = async (blob: string):Promise<{width: number, height:number}> => {
        return new Promise((resolve, _reject) => {
            const image = new Image();
            image.src = blob;
            image.onload = () => resolve({width: image.width, height: image.height})
        });
    }    

    const onCropComplete = async (_croppedArea: Area, croppedAreaPixels: Area) => {
        let newCrop = crop;
        if(aspect.value === 0) {            
            const {width, height} = await getImageDimensions(props.file.blob);

            newCrop = {x:0, y:0};
            croppedAreaPixels = {
                x: 0,
                y: 0,
                width,
                height,
            };
            setCrop(newCrop);
            setWidth(width);
            setHeight(height);
        }

        setCroppedAreaPixels(croppedAreaPixels);
        
        props.onCropComplete(newCrop, zoom, rotation, aspect, croppedAreaPixels);
    };

    const renderAspectRatioMenu = () => {
        return (
            <AspectPopupMenu>
                {aspectRatios.map((ratio) => {
                    let selected = {selected: (aspect === ratio)};
                
                    return (
                        <AspectPopupMenuItem {...selected} key={ratio.text} onClick={() => setAspect(ratio)}>
                            <AspectPopupMenuItemContent>
                                <Div>{ratio.text}</Div>
                                {ratio.icon && ratio.icon.element}
                            </AspectPopupMenuItemContent>
                        </AspectPopupMenuItem>);
                    })
                }                
            </AspectPopupMenu>
        );
    }    

    let inputProps:any = {};
    if(props.isVideoFile) {
        inputProps = {video: props.file.blob};
    } else {
        inputProps = {image: props.file.blob};
    }

    // If we are flagged for reset we need to resync the local state with the props
    // necessary otherwise we end up with a race condition where we have advanced
    // page number but haven't yet updated the previous page's state. Instead we
    // update the new image's state with now bad data
    if(isFlaggedForReset) {
        resetStateToProps();
    }    

    const aspectRatioValue = (aspect.value !== 0) ? aspect.value : (width / height);

    return (
        <>
            <ModalSectionWrapper>
                <CropContainer>
                    <CropperWrapper>
                        <CropperContainer>
                            <Cropper
                                {...inputProps}
                                crop={crop}
                                rotation={rotation}
                                zoom={zoom}
                                aspect={aspectRatioValue}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onRotationChange={setRotation}
                                onCropComplete={onCropComplete}                    
                            />
                            {isAspectMenuOpen && renderAspectRatioMenu()}                          
                        </CropperContainer>
                        <CropperAspectRatioButtonWrapper>
                            <CropperAspectRatioButton $isopen={`${isAspectMenuOpen}`} onClick={() => setIsAspectMenuOpen(!isAspectMenuOpen)}>
                                <CropSVG width="24px" height="24px" />
                            </CropperAspectRatioButton>                            
                        </CropperAspectRatioButtonWrapper>
                        {props.hasPrev && 
                            <MediaSliderButton direction="bottomLeft" onClick={() => {props.onPrevFile(); setIsFlaggedForReset(true)}} />
                        }
                        {props.hasNext &&
                            <MediaSliderButton direction="bottomRight" onClick={() => {props.onNextFile(); setIsFlaggedForReset(true)}} />
                        }
                    </CropperWrapper>
                </CropContainer>
            </ModalSectionWrapper>
            <ModalSectionWrapper style={{width: "100%"}}>
                <Flex>
                    <Slider
                        value={zoom}
                        min={0}
                        max={4}
                        step={0.1}
                        label="Zoom"
                        aria-labelledby="Zoom"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setZoom(Number.parseFloat(e.target.value))
                        }}
                    />
                    <Slider
                        value={rotation}
                        min={0}
                        max={360}
                        step={1}
                        label="Rotation"
                        aria-labelledby="Rotation"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRotation(Number.parseFloat(e.target.value))}
                    />                    
                </Flex>
            </ModalSectionWrapper>
        </>
    )
}

export default CreatePostModalCrop;