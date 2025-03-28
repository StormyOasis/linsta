import React, { ReactNode } from "react";
import { styled } from "styled-components";
import { Div, Flex } from "../../../Common/CombinedStyling";
import { actions, useAppDispatch, useAppSelector } from "../../../../Components/Redux/redux";
import { MODAL_TYPES, ModalState } from "../../../../Components/Redux/slices/modals.slice";
import CreatePostModal from "./CreatePost/CreatePostModal";
import CommentModal from "./Comments/CommentsModal";
import LikesModal from "./Main/LikesModal";
import PfpModal from "./Profile/ProfilePicModal";
import FollowersModal from "./Profile/FollowersModal";

const MODAL_ZINDEX_BASE: number = 9990;

const ModalOverlayBackground = styled(Flex) <{ $isOverlayEnabled: boolean, $zIndex?: string }>`
    justify-content: center;  
    align-items: flex-start;
    background-color: rgba(0,0,0,.6);
    min-width: 100%;
    max-width: 100%;
    position: fixed;
    z-index: ${props => props.$zIndex};   
    min-height: ${props => props.$isOverlayEnabled ? "100%" : "0"};
    height: ${props => props.$isOverlayEnabled ? "100%" : "0"};
`;

const ModalManager: React.FC<{}> = () => {
    const isOverlayEnabled: boolean = useAppSelector((state) => state.modal.isOverlayEnabled);
    const openModals: ModalState[] = useAppSelector((state) => state.modal.openModalStack);

    const dispatch = useAppDispatch();

    const closeModal = (modalName: string, data: any) => {
        dispatch(actions.modalActions.closeModal({modalName, data}));
    }

    // Update the modal's data in Redux
    const updateModalData = (modalName: string, data: any) => {
        dispatch(actions.modalActions.updateModalData({ modalName, data }));
    };    

    const renderModals = () => {
        const modals: ReactNode[] = [];

        if (openModals.length === 0) {
            return null;
        }

        // Render each Modal in the stack
        let zIndex = MODAL_ZINDEX_BASE;
        for (let iter of openModals) {
            const modalState: ModalState = iter as ModalState;            
            switch (modalState.modalName) {
                case MODAL_TYPES.NEW_POST_MODAL: {
                    modals.push(                        
                        <CreatePostModal                             
                            key={MODAL_TYPES.NEW_POST_MODAL} 
                            zIndex={zIndex}
                            onClose={() => closeModal(modalState.modalName, modalState.data)} />);
                    break;
                }
                case MODAL_TYPES.COMMENT_MODAL: {
                    modals.push(
                        <CommentModal 
                            key={MODAL_TYPES.COMMENT_MODAL}
                            zIndex={zIndex}
                            post={modalState.data.post}
                            onClose={() => {
                                // Before closing, update Redux state with the new data
                                updateModalData(modalState.modalName, {post: modalState.data.post});
                                closeModal(modalState.modalName, {post: modalState.data.post});
                            }} />);                        
                    break;
                }
                case MODAL_TYPES.LIKES_MODAL: {
                    modals.push(
                        <LikesModal 
                            key={MODAL_TYPES.LIKES_MODAL}
                            zIndex={zIndex}
                            post={modalState.data.post}
                            onClose={() => closeModal(modalState.modalName, modalState.data)} />);
                    break;
                }       
                case MODAL_TYPES.PROFILE_PIC_MODAL: {
                    modals.push(
                        <PfpModal 
                            key={MODAL_TYPES.PROFILE_PIC_MODAL}
                            zIndex={zIndex}
                            profile={modalState.data.profile}
                            onClose={() => {
                                // Before closing, update Redux state with the new data
                                updateModalData(modalState.modalName, {profile: modalState.data.profile});
                                closeModal(modalState.modalName, {profile: modalState.data.profile});
                            }} />);     
                    break;
                }
                case MODAL_TYPES.FOLLOW_MODAL: {
                    modals.push(
                        <FollowersModal 
                            key={MODAL_TYPES.FOLLOW_MODAL}
                            zIndex={zIndex}
                            profile={modalState.data.profile}
                            followModalType={modalState.data.followModalType}
                            onClose={() => {                                
                                // Before closing, update Redux state with the new data
                                dispatch(actions.profileActions.forceUpdate());
                                //updateModalData(modalState.modalName, {nonce: modalState.data.nonce});
                                closeModal(modalState.modalName, {nonce: modalState.data.nonce});
                            }} />);  
                    break;
                }                                             
                default: {
                    console.warn("Invalid modal");
                    break;
                }
            }
            zIndex++;
        }

        return modals;
    }

    return (
        <>
            <ModalOverlayBackground $isOverlayEnabled={isOverlayEnabled} $zIndex={`${MODAL_ZINDEX_BASE + openModals.length - 1}`} />
            <Div $position="relative" id="modalOverlay" >                
                { isOverlayEnabled && renderModals() }
            </Div>
        </>
    );
};

export default ModalManager;