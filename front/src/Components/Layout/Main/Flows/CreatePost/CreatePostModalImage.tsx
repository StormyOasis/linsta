import React, { useState } from "react";
import Theme from "../../../../../Components/Themes/Theme";
import styled from "styled-components";
import * as styles from '../../Main.module.css';
import MediaSVG from "/public/images/media.svg";
import { ModalContentWrapper } from "../../../../../Components/Common/MultiStepModal";

export type CreatePostModalImageProps = {
}

const CreatePostModalImage: React.FC<CreatePostModalImageProps> = (props: CreatePostModalImageProps) => {
    return (
        <ModalContentWrapper>
            <MediaSVG />
        </ModalContentWrapper>
    );
}

export default CreatePostModalImage;