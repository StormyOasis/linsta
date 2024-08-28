import React, { useEffect, useState } from "react";
import Theme from "../../../../../Components/Themes/Theme";
import styled from "styled-components";
import * as styles from '../../Main.module.css';

import MultiStepModal from "../../../../../Components/Common/MultiStepModal";
import CreatePostModalCrop, { CropData, defaultCropData } from "./CreatePostModalCrop";
import CreatePostModalSelectMedia from "./CreatePostModalSelectMedia";
import { isVideoFileFromType } from "../../../../../utils/utils";
import getCroppedImg from "../../../../../utils/cropImage";
import CreatePostModalEdit, { EditData } from "./CreatePostModalEdit";


export type CreatePostModalProps = {
    onClose: any
}

const CreatePostModal: React.FC<CreatePostModalProps> = (props: CreatePostModalProps) => {
    const [cropData, setCropData] = useState<CropData[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [editData, setEditData] = useState<EditData[]>([]);
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
                imageUrl = file.blob;
            } else {
                imageUrl = await getCroppedImg(file.blob, cropData[index].croppedAreaPixels, cropData[index].rotation);    
            }

            newImageUrls.push(imageUrl);
        }

        setImageUrls(newImageUrls);
        initEditorData(newImageUrls);
    };

    const initEditorData = (newImageUrls: string[]) => {
        const newEditorData = [];
        
        for(let idx in files) {
            const index:number = parseInt(idx);
            const file:any = files[index];

            const isVideoFile:boolean = isVideoFileFromType(file.type);
            
            const data:EditData = {
                isVideoFile,
                index,
                originalUrl: newImageUrls[index],
                editedUrl: newImageUrls[index],
                filterName: 'original'
            }
            newEditorData[index] = data;
        } 
        
        setEditData(newEditorData);
    }

    const onEditedFile = (updatedEditData: EditData, newUrl: string, newFilterName: string) => {        
        const newEditData = [...editData];
        const oldBlob = newEditData[updatedEditData.index].editedUrl;
        newEditData[updatedEditData.index].editedUrl = newUrl;
        newEditData[updatedEditData.index].filterName = newFilterName;

        if(oldBlob !== newEditData[updatedEditData.index].originalUrl && oldBlob !== newUrl) {
            // Want to revoke the url to any blobs created unless it is the original image
            // Or if it matches the new one for some reason
            URL.revokeObjectURL(oldBlob);
        }

        setEditData(newEditData);
    }
    
    const clearAllFileData = () => {
        files.forEach((file:any) => URL.revokeObjectURL(file.blob));
        imageUrls.forEach((imageUrl:string) => URL.revokeObjectURL(imageUrl));
        editData.forEach((data:EditData) => URL.revokeObjectURL(data.editedUrl));

        setFiles([]);
        setCropData([]);
        setImageUrls([]);
        setEditData([]);
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
        },
        {
            title: "Edit",
            element: <CreatePostModalEdit editData={editData} onEditedFile={onEditedFile} />,
            options: {
                showFooter: true,
                footerNextPageText: "Next"
            },
            onNext: async () => {setStepNumber(stepNumber + 1)},
            onPrev: () => {setStepNumber(stepNumber - 1)}            
        },        
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