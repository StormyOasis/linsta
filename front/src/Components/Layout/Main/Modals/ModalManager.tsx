import React, { useCallback } from "react";
import { styled } from "styled-components";
import { Div, Flex } from "../../../Common/CombinedStyling";
import { actions, useAppDispatch, useAppSelector } from "../../../../Components/Redux/redux";
import { MODAL_TYPES, ModalState } from "../../../../Components/Redux/slices/modals.slice";
import CreatePostModal from "./CreatePost/CreatePostModal";
import CommentModal from "./Comments/CommentsModal";
import LikesModal from "./Main/LikesModal";
import PfpModal from "./Profile/ProfilePicModal";
import FollowersModal from "./Profile/FollowersModal";
import DeleteCommentModal from "./Comments/DeleteCommentModal";
import EditPostMenuModal from "./Comments/EditPostMenuModal";
import EditPostModal from "./Comments/EditPostModal";
import { ForgotPasswordModal } from "../../Login/ForgotPasswordLayout";
import { SignupBirthdayModal } from "../../Signup/Flow/SignupBirthdayModal";
import CollaboratorsModal from "./CollaboratorsModal";

const MODAL_ZINDEX_BASE: number = 9990;

const ModalOverlayBackground = styled(Flex) <{ $isOverlayEnabled: boolean, $zIndex?: string }>`
    justify-content: center;  
    align-items: flex-start;
    background-color: rgba(0,0,0,.6);
    min-width: 100%;
    max-width: 100%;
    position: fixed;
    z-index: ${props => props.$zIndex || MODAL_ZINDEX_BASE};   
    min-height: ${props => props.$isOverlayEnabled ? "100%" : "0"};
    height: ${props => props.$isOverlayEnabled ? "100%" : "0"};
`;

const ModalManager: React.FC<{}> = () => {
    const { isOverlayEnabled, openModalStack } = useAppSelector((state) => state.modal);

    const dispatch = useAppDispatch();

    // Send the close command to Redux
    const closeModal = useCallback((modalName: string, data: any) => {
        dispatch(actions.modalActions.closeModal({ modalName, data }));
    }, [dispatch]);

    // Update the modal's data in Redux
    const updateModalData = useCallback((modalName: string, data: any) => {
        dispatch(actions.modalActions.updateModalData({ modalName, data }));
    }, [dispatch]);

    const renderModals = () => {
        if (openModalStack.length === 0) {
            return null;
        }

        // Render each Modal in the stack
        let zIndex = MODAL_ZINDEX_BASE;
        return openModalStack.map((modalState: ModalState) => {
            const { modalName, data } = modalState;

            switch (modalName) {
                case MODAL_TYPES.FORGOT_PASSWORD_MODAL: {
                    return <ForgotPasswordModal
                        key={MODAL_TYPES.FORGOT_PASSWORD_MODAL}
                        zIndex={zIndex++}
                        queryResponseTitle={data.queryResponseTitle} 
                        queryResponseText={data.queryResponseText}
                        onClose={() => {
                            closeModal(modalName, {})
                        }} />;
                }                
                case MODAL_TYPES.NEW_POST_MODAL: {
                    return <CreatePostModal
                        key={MODAL_TYPES.NEW_POST_MODAL}
                        zIndex={zIndex++}
                        onClose={() => closeModal(modalName, data)} />;
                }
                case MODAL_TYPES.SIGNUP_BIRTHDAY_MODAL: {
                    return <SignupBirthdayModal
                        key={MODAL_TYPES.SIGNUP_BIRTHDAY_MODAL}
                        zIndex={zIndex++}
                        onClose={() => closeModal(modalName, data)} />;
                }                                
                case MODAL_TYPES.COMMENT_MODAL: {
                    return <CommentModal
                        key={MODAL_TYPES.COMMENT_MODAL}
                        zIndex={zIndex++}
                        post={data.post}
                        onClose={() => {
                            // Before closing, update Redux state with the new data
                            updateModalData(modalName, { post: data.post });
                            closeModal(modalName, { post: data.post });
                        }} />;
                }
                case MODAL_TYPES.LIKES_MODAL: {
                    return <LikesModal
                        key={MODAL_TYPES.LIKES_MODAL}
                        zIndex={zIndex++}
                        post={data.post}
                        onClose={() => closeModal(modalName, data)} />;
                }
                case MODAL_TYPES.COLLABORATORS_MODAL: {
                    return <CollaboratorsModal
                        key={MODAL_TYPES.COLLABORATORS_MODAL}
                        zIndex={zIndex++}
                        post={data.post}
                        onClose={() => closeModal(modalName, data)} />;
                }                
                case MODAL_TYPES.PROFILE_PIC_MODAL: {
                    return <PfpModal
                        key={MODAL_TYPES.PROFILE_PIC_MODAL}
                        zIndex={zIndex++}
                        profile={data.profile}
                        onClose={() => {
                            // Before closing, update Redux state with the new data
                            updateModalData(modalName, { profile: data.profile });
                            closeModal(modalName, { profile: data.profile });
                        }} />;
                }
                case MODAL_TYPES.FOLLOW_MODAL: {
                    return <FollowersModal
                        key={MODAL_TYPES.FOLLOW_MODAL}
                        zIndex={zIndex++}
                        profile={data.profile}
                        followModalType={data.followModalType}
                        onClose={() => {
                            // Before closing, update Redux state with the new data
                            dispatch(actions.profileActions.forceUpdate());
                            closeModal(modalName, { nonce: data.nonce });
                        }} />;
                }
                case MODAL_TYPES.COMMENT_DELETE_MODAL: {
                    return <DeleteCommentModal
                        key={MODAL_TYPES.COMMENT_DELETE_MODAL}
                        zIndex={zIndex++}
                        commentId={data.commentId}
                        onClose={(closeData: any) => {
                            // Before closing, update Redux state with the new data
                            if(closeData.isCommited) {
                                dispatch(actions.miscActions.updateDeletedCommentId(data.commentId));
                            }
                            closeModal(modalName, {deletedCommentId: data.commentId})
                        }} />;
                }
                case MODAL_TYPES.POST_EDIT_MENU_MODAL: {
                    return <EditPostMenuModal 
                        key={MODAL_TYPES.POST_EDIT_MENU_MODAL}
                        zIndex={zIndex++}
                        post={data.post}
                        onClose={(closeData: any) => {
                            // Before closing, update Redux state with the new data
                            if(closeData.isCommited) {
                                if(closeData.isDeleted) {
                                    dispatch(actions.miscActions.updateDeletedPostId(data.post.postId));
                                    updateModalData(MODAL_TYPES.COMMENT_MODAL, { post: data.post });
                                    closeModal(MODAL_TYPES.COMMENT_MODAL, { post: data.post });                                    
                                } else {    
                                    dispatch(actions.miscActions.updateUpdatedPost(closeData.post));
                                    updateModalData(MODAL_TYPES.COMMENT_MODAL, { post: closeData.post });                                                                 
                                }
                            }
                            closeModal(modalName, {postId: data.post.postId})
                        }} />;                                                
                }
                case MODAL_TYPES.POST_EDIT_MODAL: {
                    return <EditPostModal
                        key={MODAL_TYPES.POST_EDIT_MODAL}
                        zIndex={zIndex++}
                        post={data.post}
                        onClose={(closeData: any) => {
                            // Before closing, update Redux state with the new data
                            if(closeData.isCommited) {
                                if(closeData.isDeleted) {
                                    dispatch(actions.miscActions.updateDeletedPostId(data.post.postId));
                                    updateModalData(MODAL_TYPES.COMMENT_MODAL, { post: data.post });
                                    closeModal(MODAL_TYPES.COMMENT_MODAL, { post: data.post });                                    
                                } else {    
                                    dispatch(actions.miscActions.updateUpdatedPost(closeData.post));
                                    updateModalData(MODAL_TYPES.COMMENT_MODAL, { post: closeData.post });                                                                 
                                }
                            }
                            closeModal(modalName, {postId: data.post.postId})
                        }} />;
                }                
                default: {
                    console.warn("Invalid modal");
                    return null;
                }
            }
        });
    }

    return (
        <>
            <ModalOverlayBackground $isOverlayEnabled={isOverlayEnabled} $zIndex={`${MODAL_ZINDEX_BASE + openModalStack.length - 1}`} />
            <Div $position="relative" id="modalOverlay" >
                {isOverlayEnabled && renderModals()}
            </Div>
        </>
    );
};

export default ModalManager;