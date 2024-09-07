import React, { RefObject, useEffect, useState } from "react";

import MultiStepModal from "../../../../../Components/Common/MultiStepModal";
import CreatePostModalCrop, { CropData, defaultCropData } from "./CreatePostModalCrop";
import CreatePostModalSelectMedia from "./CreatePostModalSelectMedia";
import { base64ToBlob, blobToBase64, isVideoFileFromType } from "../../../../../utils/utils";
import getCroppedImg from "../../../../../utils/cropImage";
import CreatePostModalEdit from "./CreatePostModalEdit";
import { clear, del, get, set } from 'idb-keyval';
import CreatePostModalFinal from "./CreatePostModalFinal";
import { postSubmitPost, putSubmitPost } from "../../../../../api/ServiceController";

export type CreatePostModalProps = {
    onClose: any
}

export type EditData = {
    isVideoFile: boolean;
    index: number;
    originalUrl: string;
    editedUrl: string;
    filterName: string;
}

const CreatePostModal: React.FC<CreatePostModalProps> = (props: CreatePostModalProps) => {
    const [cropData, setCropData] = useState<CropData[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [editData, setEditData] = useState<EditData[]>([]);
    const [files, setFiles] = useState([]);    
    const [hasFileRejections, setHasFileRejections] = useState(false);    
    const [stepNumber, setStepNumber] = useState(0);
    const [lexicalText, setLexicalText] = useState<string|null>(null);

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
            
            const data:EditData = {
                isVideoFile,
                index,
                originalUrl: newImageUrls[index],
                editedUrl: newImageUrls[index],
                filterName: 'original'
            }
            newEditorData[index] = data;

            if(!isVideoFile) {
                set(newImageUrls[index], await blobToBase64(newImageUrls[index]));
            }             
        } 

        setEditData(newEditorData);
    }

    const onEditedFile = async (updatedEditData: EditData, newUrl: string, newFilterName: string) => {            
        const newEditData = [...editData];
        const oldBlob = newEditData[updatedEditData.index].editedUrl;
        newEditData[updatedEditData.index].editedUrl = newUrl;
        newEditData[updatedEditData.index].filterName = newFilterName;

        if(oldBlob !== newEditData[updatedEditData.index].originalUrl && oldBlob !== newUrl) {
            // Want to revoke the url to any blobs created unless it is the original image
            // Or if it matches the new one for some reason
            await del(oldBlob);
            URL.revokeObjectURL(oldBlob);                        
        }

        // add to the image cache in indexdb
        if(!updatedEditData.isVideoFile) {
            set(newUrl, await blobToBase64(newUrl));
        }
        
        setEditData(newEditData);
    }

    const loadImage = (updatedEditData: EditData, url: string, imageRef:RefObject<HTMLImageElement>):string => {
        (async () => {
            let imageSrc = url;
            try {
                const result = await fetch(imageSrc);
                if(result.status === 200) {
                    return await result.blob();
                }

            } catch (err) {
                // assume it's a 404
                // load the image from the cache
                const value = await get(url);
                const file = base64ToBlob(value, url);
                if(file === null) {
                    throw new Error("Invalid cache key");
                }

                const newUrl = URL.createObjectURL(file);
                
                // update the state
                const newEditData = [...editData];
                const oldBlob = newEditData[updatedEditData.index].editedUrl;
                newEditData[updatedEditData.index].editedUrl = newUrl;

                if(oldBlob !== newEditData[updatedEditData.index].originalUrl && oldBlob !== newUrl) {
                    // Want to revoke the url to any blobs created unless it is the original image
                    // Or if it matches the new one for some reason
                    await del(oldBlob);
                    URL.revokeObjectURL(oldBlob);                        
                }

                setEditData(newEditData);  

                if(imageRef && imageRef.current) {
                    imageRef.current.src = newUrl;             
                }
            }

            return null;
        })();

        return url;
    }

    const handleLexicalChange = (data: string) => {
        setLexicalText(data);
    }

    const handleChange = (field: string, data: any) => {
        switch(field) {
            case "altInput": {
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
        editData.forEach((data:EditData) => URL.revokeObjectURL(data.editedUrl));

        setFiles([]);
        setCropData([]);
        setImageUrls([]);
        setEditData([]);
        setHasFileRejections(false);
        clear(); //clear out the indexdb cache
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
            element: <CreatePostModalFinal editData={editData} onLexicalChange={handleLexicalChange} onChange={handleChange} />,
            options: {
                showFooter: true,
                footerNextPageText: "Share"
            },
            onNext: async () => submitPost(),
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