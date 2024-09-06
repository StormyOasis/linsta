import React from "react";
import MediaSVG from "/public/images/media.svg";
import { ModalSectionWrapper } from "../../../../Common/MultiStepModal";
import StyledButton from "../../../../Common/StyledButton";
import WarningSVG from "/public/images/warning.svg";
import { useDropzone } from "react-dropzone";

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
                    <span style={{
                        display: "block", fontSize: "20px", lineHeight: "25px",
                        margin: 0, maxWidth: "100%", overflow: "visible", overflowWrap: "break-word",
                        position: "relative", textWrap: "wrap", wordBreak: "break-word"
                    }}>
                        {!props.hasFileRejections && 'Drag photos and videos here'}
                        {props.hasFileRejections && 'One or more files is not supported'}
                    </span>
                </ModalSectionWrapper>
                <ModalSectionWrapper style={{ marginTop: "30px", padding: "10px" }}>
                    <StyledButton text="Select From Computer" onClick={open} type="button" name="selectImageFromComputer"></StyledButton>
                </ModalSectionWrapper>
            </div>
        </>
    );
}

export default CreatePostModalSelectMedia;