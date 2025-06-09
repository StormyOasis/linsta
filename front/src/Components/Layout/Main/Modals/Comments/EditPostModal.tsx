import React, { useEffect, useState } from "react";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { CollabData, Post, Profile } from "../../../../../api/types";
import { isVideoFileFromType, updatePostFields } from "../../../../../utils/utils";
import CreatePostModalFinal from "../CreatePost/CreatePostModalFinal";
import { EditData } from "../CreatePost/CreatePostModal";

type EditPostModalProps = {
    onClose: (data?: any) => void;
    post: Post;
    zIndex: number;
}

const EditPostModal: React.FC<EditPostModalProps> = (props: EditPostModalProps) => {
    const [editData, setEditData] = useState<EditData[]>([]);
    const [lexicalText, setLexicalText] = useState<string|null>(props.post.global.captionText);
    const [locationText, setLocationText] = useState<string>(props.post.global.locationText);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [collabData, setCollabData] = useState<CollabData>({selectedProfiles: {}} as CollabData);

    useEffect(() => {
        const newEditData: EditData[] = [];
        for (let i = 0; i < props.post.media.length; i++) {
            const media = props.post.media[i];
            newEditData.push({
                id: media.id,
                isVideoFile: isVideoFileFromType(media.mimeType),
                index: i,
                originalUrl: media.path,
                data: media.path,
                filterName: "",
                altText: media.altText || ""
            });
        }

        const selectedProfiles: Record<string, Profile> = Object.entries(props.post.global.collaborators).reduce(
            (acc, [key, value]) => {
                acc[key] = value as Profile;
                return acc;
            },
            {} as Record<string, Profile>
        );


        setEditData(newEditData);
        setCollabData({ selectedProfiles });
    }, []);


    const handleLexicalChange = (data: string, charCount: number) => {
        if(charCount === 0) {
            setLexicalText(null);
        } else {
            setLexicalText(data);
        }
    }

    const handleAltInputChanged = (index: number, value: string) => {
        const altText = value;
        const newEditData:EditData[] = [...editData];
        const entry = newEditData[index];
        entry.altText = altText;
        newEditData[index] = entry;
        setEditData(newEditData);        
    }

    const handleLocationChanged = (value: string) => {
        setLocationText(value);
    }   
    
    const submitEditPost = async () => {
        setIsSubmitting(true);

        const fieldsToUpdate = [
            {key: "captionText", value: (lexicalText || "")},
            {key: "locationText", value: locationText},
            {key: "collabData", value: collabData},
            {key: "altText", value: [...editData.map((entry:EditData) => {
                return entry.altText;
            })]}
        ];

        await updatePostFields(props.post, fieldsToUpdate, props.onClose);

        setIsSubmitting(false);
    }     

    const handleCollabChanged = (data: CollabData) => {               
        setCollabData({
            selectedProfiles: data.selectedProfiles,           
        });
    }    

    const steps = [
        {
            title: "Edit Post",            
            options: {
                showFooter: true,
                hideHeader: false,
                hideMargins: false,
                footerNextPageText: "Update"                         
            },
            onNext: async () => await submitEditPost(),
            onPrev: () => {
                props.onClose({isCommited: false});
            },                   
            element: <CreatePostModalFinal 
                        editData={editData}
                        collabData={collabData}
                        locationText={locationText}
                        lexicalText={lexicalText || ""}
                        isCommentsDisabled={props.post.global.commentsDisabled}
                        isLikesDisabled={props.post.global.likesDisabled}
                        hasErrorOccured={false}
                        hideAdvancedSettings={true}
                        onAltImageChanged={handleAltInputChanged}
                        onLocationChanged={handleLocationChanged}
                        onLexicalChange={handleLexicalChange} 
                        onDisableCommentsChanged={() => {}}
                        onDisableLikesChanged={() => {}}
                        onCollabChanged={handleCollabChanged} />
        }
    ];

    return (
        <>
            <MultiStepModal zIndex={props.zIndex} steps={steps} onClose={props.onClose} stepNumber={0} showLoadingAnimation={isSubmitting} />
        </>
    );
}

export default EditPostModal;