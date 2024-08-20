import React, { useState } from "react";
import Theme from "../../../../../Components/Themes/Theme";
import styled from "styled-components";
import * as styles from '../../Main.module.css';
import CreatePostModalImage from "./CreatePostModalImage";
import MultiStepModal from "../../../../../Components/Common/MultiStepModal";
import Modal from "../../../../../Components/Common/Modal";

export type CreatePostModalProps = {
    onClose: any
}

const CreatePostModal: React.FC<CreatePostModalProps> = (props: CreatePostModalProps) => {
    const steps = [
        {
            title: "Create New Post",
            element: <CreatePostModalImage />
        }
    ];

    /*return (
        <MultiStepModal steps={steps} onClose={props.onClose} />
    );*/
    return (<Modal onClose={()=>true} title="Helllw" />)
}

export default CreatePostModal;