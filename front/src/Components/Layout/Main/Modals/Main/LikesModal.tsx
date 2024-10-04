import React, { useEffect, useState } from "react";
import styled from "styled-components";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { Post } from "../../../../../api/types";

type LikesModalProps = {
    onClose: any;
    post: Post;
}

type LikesModalContentProps = {
    post: Post;
}

const LikesModalInfoText = styled.span`
    color: ${props => props.theme['colors'].mediumTextColor};
`

const LikesModalContent: React.FC<LikesModalContentProps> = (props: LikesModalContentProps) => {

    useEffect(() => {
       /* find a way to query the list of who you follow and compare against
        who liked this post, without overloading the server     */   

        //create a bulk get friendship request that requeries as you scroll. Also make a request that will look up individual friendship info on mouseover
    }, []);
    
    if(props.post == null) {
        return <></>;
    }

    return (
        <div>
            <div style={{margin:"auto"}}>
                <LikesModalInfoText>{props.post.user.userName} can see the number of people who liked this post</LikesModalInfoText>
            </div>
        </div>
    );
}

const LikesModal: React.FC<LikesModalProps> = (props: LikesModalProps) => {
    
    const steps = [
        {
            title: "Likes",
            element: <LikesModalContent post={props.post} />,
            options: {
                showFooter: false,
            },
        }
    ];

    return (
        <>
            <MultiStepModal steps={steps} onClose={props.onClose} stepNumber={0} showLoadingAnimation={false} />
        </>
    );
}

export default LikesModal;