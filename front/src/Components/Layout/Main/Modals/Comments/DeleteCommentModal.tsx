import React from "react";
import styled from "styled-components";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { postDeleteComment } from "../../../../../../src/api/ServiceController";
import { Div, FlexColumnFullWidth } from "../../../../../Components/Common/CombinedStyling";
import StyledLink from "../../../../../Components/Common/StyledLink";

type DeleteCommentModalProps = {
    onClose: (data?: any) => void;
    commentId: string;
    zIndex: number;
}

type DeleteModalContentProps = {
    onClose: (data?: any) => void;
    commentId: string;    
}

const CustomStyledLink = styled(StyledLink) <{ $optionNum: number }>`
    font-weight: ${props => props.$optionNum === 1 ? 400 : 600};
    color:  ${props => props.$optionNum === 0 ? props => props.theme['colors'].warningTextColor : props.theme['colors'].defaultTextColor};
    
    &:hover {
        color: ${props => props.$optionNum === 0 ? props => props.theme['colors'].warningTextColor : props.theme['colors'].defaultTextColor};
    }
`;

const OptionDiv = styled(Div)<{ $showTopBorder?: boolean }>`
    cursor: pointer;    
    min-height: 40px;
    width: 100%;
    align-content: center;
    border-top: ${props => props.$showTopBorder ? "1px solid " + props.theme['colors'].borderDefaultColor : "none" };

    &:hover {
        background-color: ${props => props.theme['colors'].buttonSecondaryOnHoverColor};    
    }    
`;

const DeleteModalContent: React.FC<DeleteModalContentProps> = (props: DeleteModalContentProps) => {
    const handleDeleteComment = async () => {
        try {
            // Call the delete comment service
            const results = await postDeleteComment({ commentId: props.commentId });
            if(results == null || results.status !== 200) {
                throw new Error("Error deleting comment");
            }            
            // Close the modal
            props.onClose({isCommited: true});
        } catch(err) {
            console.error(err)
        }
    }

    return (
        <FlexColumnFullWidth $textAlign="center">
            <OptionDiv onClick={handleDeleteComment}>
                <CustomStyledLink $optionNum={0}>
                    Delete Comment
                </CustomStyledLink>
            </OptionDiv>
            <OptionDiv $showTopBorder={true} onClick={() => props.onClose({isCommited: false})}>
                <CustomStyledLink $optionNum={1}>
                    Cancel
                </CustomStyledLink>
            </OptionDiv>            
        </FlexColumnFullWidth>
    );
}

const DeleteCommentModal: React.FC<DeleteCommentModalProps> = (props: DeleteCommentModalProps) => {

    const steps = [
        {
            title: "Delete Comment",
            element: <DeleteModalContent commentId={props.commentId} onClose={props.onClose} />,
            options: {
                showFooter: false,
                hideHeader: true,
                hideMargins: true                
            },
        }
    ];

    return (
        <>
            <MultiStepModal zIndex={props.zIndex} steps={steps} onClose={props.onClose} stepNumber={0} showLoadingAnimation={false} />
        </>
    );
}

export default DeleteCommentModal;