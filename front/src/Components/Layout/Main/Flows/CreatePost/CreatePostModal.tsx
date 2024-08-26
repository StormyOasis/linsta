import React, { useEffect, useState } from "react";
import Theme from "../../../../../Components/Themes/Theme";
import styled from "styled-components";
import * as styles from '../../Main.module.css';

import MultiStepModal from "../../../../../Components/Common/MultiStepModal";
import CreatePostModalCrop, { CropData, defaultCropData } from "./CreatePostModalCrop";
import CreatePostModalSelectMedia from "./CreatePostModalSelectMedia";
import { isVideoFileFromType } from "../../../../../utils/utils";
import getCroppedImg from "../../../../../utils/cropImage";


export type CreatePostModalProps = {
    onClose: any
}

const CreatePostModal: React.FC<CreatePostModalProps> = (props: CreatePostModalProps) => {
    const [cropData, setCropData] = useState<CropData[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [files, setFiles] = useState([]);    
    const [stepNumber, setStepNumber] = useState(0);

    const onSetFiles = (files: any) => {
        if(files.length === 0) {
            return;
        }
        
        setFiles(files);
        setStepNumber(stepNumber + 1);
        setCropData(defaultCropData(files.length));
    }   

    const onCrop = async () => {
        const newImageUrls:string[] = [];
        
        for(let index in files) {
            const file:any = files[index];

            const isVideo:boolean = isVideoFileFromType(file.type);
            let imageUrl = null;

            if(isVideo) {
                imageUrl = URL.createObjectURL(file.blob);
            } else {
                imageUrl = await getCroppedImg(file.blob, cropData[index].croppedAreaPixels, cropData[index].rotation);    
            }

            newImageUrls.push(imageUrl);
        }

        setImageUrls(newImageUrls);
    };  
    
    const clearAllFileData = () => {
        files.forEach((file:any) => URL.revokeObjectURL(file.blob));
        imageUrls.forEach((imageUrl:string) => URL.revokeObjectURL(imageUrl));

        setFiles([]);
        setCropData([]);
        setImageUrls([]);
    }

    const steps = [
        {
            title: "Create New Post",
            element: <CreatePostModalSelectMedia setFiles={onSetFiles} />,
            options: {
                showFooter: false,
            },
        },
        {
            title: "Crop",
            element: <CreatePostModalCrop files={files} cropData={cropData} setCropData={setCropData} />,
            options: {
                showFooter: true,
                footerNextPageText: "Next"
            },
            onNext: async () => {await onCrop();  setStepNumber(stepNumber + 1)},
            onPrev: () => {clearAllFileData(); setStepNumber(stepNumber - 1)}
        }
    ]; 

    useEffect(() => {
        // Make sure to revoke uri's to avoid memory leaks
        return () => {clearAllFileData()}
      }, []);
    

    return (
        <MultiStepModal steps={steps} onClose={props.onClose} stepNumber={stepNumber} />
    );
}

export default CreatePostModal;