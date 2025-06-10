import React from "react";

import { ModalSectionWrapper } from "../../../../Common/MultiStepModal";
import StyledButton from "../../../../Common/StyledButton";
import { useDropzone } from "react-dropzone";
import { Span } from "../../../../../Components/Common/CombinedStyling";
import { MediaSVG, WarningSVG } from "../../../../../Components/Common/Icon";

export type CreatePostModalSelectMediaProps = {
    setFiles?: any;
    hasFileRejections: boolean;
}

const CreatePostModalSelectMedia: React.FC<CreatePostModalSelectMediaProps> = (props: CreatePostModalSelectMediaProps) => {
    const { getRootProps, getInputProps, open } = useDropzone({
        noClick: true,
        noKeyboard: true,
        accept: { 
            "image/bmp": [".bmp"],
            "image/png": ['.png'], 
            "image/jpeg": ['.jfi', '.jfif', '.jif', '.jpe', '.jpeg', '.jpg', '.pjpg'],
            "image/tiff": ['.tif', '.tiff'],
            "video/x-m4v": ['.m4v'],
            "video/mp4": ['.mp4', '.mp4v', '.mpg4'],
            "video/quicktime": [".mov"]
        },
        onDrop: (acceptedFiles, fileRejections) => {
            props?.setFiles(fileRejections.length, acceptedFiles.map(file => Object.assign(file, {
                blob: URL.createObjectURL(file),
            })));
        }
    });

    return (
        <>
            <div {...getRootProps({ className: 'dropzone' })} >
                <input {...getInputProps()} />
                <ModalSectionWrapper style={{ padding: "10px", margin:"auto", width:"50%" }}>
                    {!props.hasFileRejections && <MediaSVG />}
                    {props.hasFileRejections && <WarningSVG />}
                </ModalSectionWrapper>
                <ModalSectionWrapper style={{ marginTop: "15px", padding: "10px" }}>
                    <Span style={{textWrap: "wrap", wordBreak: "break-word", overflowWrap: "break-word", margin: 0}}
                        $display="block" $fontSize="20px" $lineHeight="25px"
                        $maxWidth="100%" $overflow="visible" $position="relative">
                            {!props.hasFileRejections && 'Drag photos and videos here'}
                            {props.hasFileRejections && 'One or more files is not supported'}
                    </Span>
                </ModalSectionWrapper>
                <ModalSectionWrapper style={{ marginTop: "30px", padding: "10px" }}>
                    <StyledButton text="Select From Computer" onClick={open} type="button" name="selectImageFromComputer"></StyledButton>
                </ModalSectionWrapper>
            </div>
        </>
    );
}

export default CreatePostModalSelectMedia;