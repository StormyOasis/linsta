import React from "react";
import * as styles from '../../Main.module.css';
import MediaSVG from "/public/images/media.svg";
import { ModalSectionWrapper } from "../../../../Common/MultiStepModal";
import StyledButton from "../../../../Common/StyledButton";
import { useDropzone } from "react-dropzone";

export type CreatePostModalSelectMediaProps = {
    setFiles?: any;
}

const CreatePostModalSelectMedia: React.FC<CreatePostModalSelectMediaProps> = (props: CreatePostModalSelectMediaProps) => {
    const { getRootProps, getInputProps, open } = useDropzone({
        noClick: true,
        noKeyboard: true,
        accept: { "image/*": [], "video/*": [] },
        onDrop: acceptedFiles => {
            props?.setFiles(acceptedFiles.map(file => Object.assign(file, {
                blob: URL.createObjectURL(file)
            })));
        }
    });

    return (
        <>
            <div {...getRootProps({ className: 'dropzone' })} >
                <input {...getInputProps()} />
                <ModalSectionWrapper style={{ padding: "10px" }}>
                    <MediaSVG />
                </ModalSectionWrapper>
                <ModalSectionWrapper style={{ marginTop: "15px", padding: "10px" }}>
                    <span style={{
                        display: "block", fontSize: "20px", lineHeight: "25px",
                        margin: 0, maxWidth: "100%", overflow: "visible", overflowWrap: "break-word",
                        position: "relative", textWrap: "wrap", wordBreak: "break-word"
                    }}>
                        Drag photos and videos here
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