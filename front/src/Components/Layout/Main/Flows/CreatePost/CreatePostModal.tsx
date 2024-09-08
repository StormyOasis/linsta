import React, { useEffect, useState } from "react";

import MultiStepModal from "../../../../../Components/Common/MultiStepModal";
import CreatePostModalCrop, { CropData, defaultCropData } from "./CreatePostModalCrop";
import CreatePostModalSelectMedia from "./CreatePostModalSelectMedia";
import { blobToBase64, isVideoFileFromType } from "../../../../../utils/utils";
import getCroppedImg from "../../../../../utils/cropImage";
import CreatePostModalEdit from "./CreatePostModalEdit";
import CreatePostModalFinal from "./CreatePostModalFinal";
import { putSubmitPost } from "../../../../../api/ServiceController";
import { clearCache, loadImageCached, setImage } from "../../../../../utils/CachedImageLoader";

export type CreatePostModalProps = {
    onClose: any
}

export type EditData = {
    id: string;
    isVideoFile: boolean;
    index: number;
    originalUrl: string;
    data: string;
    filterName: string;
    altText?: string;
}

const CreatePostModal: React.FC<CreatePostModalProps> = (props: CreatePostModalProps) => {
    const [cropData, setCropData] = useState<CropData[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [editData, setEditData] = useState<EditData[]>([]);
    const [files, setFiles] = useState([]);    
    const [hasFileRejections, setHasFileRejections] = useState<boolean>(false);    
    const [stepNumber, setStepNumber] = useState<number>(0);
    const [lexicalText, setLexicalText] = useState<string|null>(null);
    const [commentsDisabled, setCommentsDisabled] = useState<boolean>(false); 
    const [likesDisabled, setLikesDisabled] = useState<boolean>(false);

    useEffect(() => {
        // Make sure to revoke uri's to avoid memory leaks
        return () => {clearAllFileData()}
    }, []);
    
    const onSetFiles = async (rejectionsCount:number, files: any) => {
        if(rejectionsCount > 0) {
            setHasFileRejections(true);
            return;
        }
        if(files.length === 0) {
            return; //should never happen
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

    const initEditorData = async (newImageUrls: string[]) => {
        const newEditorData = [];
        
        for(let idx in files) {
            const index:number = parseInt(idx);
            const file:any = files[index];

            const isVideoFile:boolean = isVideoFileFromType(file.type);
            const imgData:string = (await blobToBase64(newImageUrls[index]) as string);

            const data:EditData = {
                id: crypto.randomUUID(),
                isVideoFile,
                index,
                originalUrl: newImageUrls[index],
                data: imgData,
                filterName: 'original'
            }
            newEditorData[index] = data;

            if(!isVideoFile) {                
                await setImage(data.id, imgData);
            }             
        } 

        setEditData(newEditorData);
    }

    const onEditedFile = async (updatedEditData: EditData, data: string, newFilterName: string) => { 
        const newEditData = [...editData];        
        newEditData[updatedEditData.index].data = data;
        newEditData[updatedEditData.index].filterName = newFilterName;

        // add to the image cache in indexdb
        if(!updatedEditData.isVideoFile) {
            setImage(updatedEditData.id, data);
        }

        setEditData(newEditData);
    }

    const loadImage =  (updatedEditData: EditData, url: string) => {
        (async () => {
            const img = await loadImageCached(updatedEditData.id, url);
            return img;
        })();

        return url;
    }

    const handleLexicalChange = (data: string) => {
        setLexicalText(data);
    }

    const handleChange = (field: string, data: any) => {        
        switch(field) {
            case "altInput": {
                const altText = data.value;
                const index = data.index;

                const newEditData:EditData[] = [...editData];
                const entry = newEditData[index];
                entry.altText = altText;
                newEditData[index] = entry;
                setEditData(newEditData);

                break;
            }
            case "turnOffComments": {
                setCommentsDisabled(data);
                break;
            }
            case "hideLikes": {
                setLikesDisabled(data);
                break;
            }
        }
    }

    const submitPost = () => {
        console.log(lexicalText);
        putSubmitPost({});
    }
    
    const clearAllFileData = () => {
        files.forEach((file:any) => URL.revokeObjectURL(file.blob));
        imageUrls.forEach((imageUrl:string) => URL.revokeObjectURL(imageUrl));
        editData.forEach((data:EditData) => URL.revokeObjectURL(data.originalUrl));
    
        setFiles([]);
        setCropData([]);
        setImageUrls([]);
        setEditData([]);
        setHasFileRejections(false);
        setCommentsDisabled(false);
        setLikesDisabled(false);
        clearCache();
    }

    const steps = [
        {
            title: "Create New Post",
            element: <CreatePostModalSelectMedia setFiles={onSetFiles} hasFileRejections={hasFileRejections} />,
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
            element: <CreatePostModalEdit editData={editData} onEditedFile={onEditedFile} loadImage={loadImage}/>,
            options: {
                showFooter: true,
                footerNextPageText: "Next"
            },
            onNext: async () => {setStepNumber(stepNumber + 1)},
            onPrev: () => {setStepNumber(stepNumber - 1)}            
        },
        {
            title: "Create Post",
            element: <CreatePostModalFinal editData={editData} 
                        isCommentsDisabled={commentsDisabled} isLikesDisabled={likesDisabled}
                        onLexicalChange={handleLexicalChange} 
                        onChange={handleChange} />,
            options: {
                showFooter: true,
                footerNextPageText: "Share"
            },
            onNext: async () => await submitPost(),
            onPrev: () => {setStepNumber(stepNumber - 1)}
        }      
    ]; 

    return (
        <>
            <MultiStepModal steps={steps} onClose={props.onClose} stepNumber={stepNumber} />
        </>
    );
}

export default CreatePostModal;