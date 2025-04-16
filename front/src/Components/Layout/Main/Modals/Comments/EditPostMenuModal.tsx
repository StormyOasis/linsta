import React from "react";
import styled from "styled-components";

import MultiStepModal from "../../../../Common/MultiStepModal";
import { postDeletePost } from "../../../../../../src/api/ServiceController";
import { Div, FlexColumnFullWidth, Span } from "../../../../../Components/Common/CombinedStyling";
import StyledLink from "../../../../../Components/Common/StyledLink";
import { Post } from "../../../../../api/types";
import { updatePost, updatePostFields } from "../../../../../utils/utils";
import { MODAL_TYPES } from "../../../../../Components/Redux/slices/modals.slice";
import { actions, useAppDispatch } from "../../../../../Components/Redux/redux";

type EditPostMenuModalProps = {
    onClose: (data?: any) => void;
    post: Post;
    zIndex: number;
}

type EditPostMenuModalContentProps = {
    onClose: (data?: any) => void;
    post: Post;    
}

const CustomStyledLink = styled(StyledLink)`
    font-weight: 400;
    color:  ${props => props.theme['colors'].defaultTextColor};
    
    &:hover {
        color: ${props => props.theme['colors'].defaultTextColor};
    }
`;

const DeleteStyledLink = styled(StyledLink)`
    font-weight: 600;
    color:  ${props => props.theme['colors'].warningTextColor};
    
    &:hover {
        color: ${props => props.theme['colors'].warningTextColor};
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

const EditPostMenuModalContent: React.FC<EditPostMenuModalContentProps> = (props: EditPostMenuModalContentProps) => {
    const dispatch = useAppDispatch();

    const handleDeletePost = async () => {
        try {
            // Call the delete post service
            const results = await postDeletePost({ postId: props.post.postId });
            if(results == null || results.status !== 200) {
                throw new Error("Error deleting post");
            }            
            // Close the modal
            props.onClose({isCommited: true, post: props.post, isDeleted: true});
        } catch(err) {
            console.error(err)
        }
    }

    const handleEditClick = () => {
        // open the edit post dialog by setting the state in redux
        dispatch(actions.modalActions.openModal({ modalName: MODAL_TYPES.POST_EDIT_MODAL, data: { post: props.post } }));

        props.onClose({isCommited: false});
    }

    if(props.post == null) {
        console.warn("Invalid post");
        return (
            <FlexColumnFullWidth $textAlign="center">
                <OptionDiv $showTopBorder={true} onClick={() => props.onClose({isCommited: false})}>
                    <CustomStyledLink>
                        Cancel
                    </CustomStyledLink>
                </OptionDiv>
            </FlexColumnFullWidth>
        );
    }

    return (
        <FlexColumnFullWidth $textAlign="center">
            <OptionDiv onClick={handleDeletePost}>
                <DeleteStyledLink>
                    Delete Post
                </DeleteStyledLink>
            </OptionDiv>
            <OptionDiv $showTopBorder={true} onClick={handleEditClick}>
                <CustomStyledLink>
                    Edit
                </CustomStyledLink>
            </OptionDiv>        
            <OptionDiv $showTopBorder={true} onClick={() => updatePostFields(props.post, [{key: "likesDisabled", value: !props.post.global.likesDisabled}], props.onClose)}>
                <CustomStyledLink>
                    {props.post.global.likesDisabled && <Span>Show like count to others</Span>}
                    {!props.post.global.likesDisabled && <Span>Hide like count to others</Span>}
                </CustomStyledLink>
            </OptionDiv>            
            <OptionDiv $showTopBorder={true} onClick={() => updatePostFields(props.post, [{key: "commentsDisabled", value: !props.post.global.commentsDisabled}], props.onClose)}>
                <CustomStyledLink>
                    {props.post.global.commentsDisabled && <Span>Turn on commenting</Span>}
                    {!props.post.global.commentsDisabled && <Span>Turn off commenting</Span>}
                </CustomStyledLink>
            </OptionDiv>                                   
            <OptionDiv $showTopBorder={true} onClick={() => props.onClose({isCommited: false})}>
                <CustomStyledLink>
                    Cancel
                </CustomStyledLink>
            </OptionDiv>            
        </FlexColumnFullWidth>
    );
}

const EditPostMenuModal: React.FC<EditPostMenuModalProps> = (props: EditPostMenuModalProps) => {

    const steps = [
        {
            title: "Edit Post Menu",
            element: <EditPostMenuModalContent post={props.post} onClose={props.onClose} />,
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

export default EditPostMenuModal;