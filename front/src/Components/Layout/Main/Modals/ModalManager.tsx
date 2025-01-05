import React, { ReactNode } from "react";
import { styled } from "styled-components";
import { Flex } from "../../../Common/CombinedStyling";
import { actions, useAppDispatch, useAppSelector } from "../../../../Components/Redux/redux";
import { COMMENT_MODAL, GlobalModalState, ModalState, NEW_POST_MODAL } from "../../../../Components/Redux/slices/modals.slice";
import CreatePostModal from "./CreatePost/CreatePostModal";
import CommentModal from "./Comments/CommentsModal";

const ModalOverlay = styled(Flex) <{ $isOverlayEnabled: boolean }>`
    justify-content: center;  
    align-items: flex-start;
    background-color: rgba(0,0,0,.6);
    min-width: 100%;
    max-width: 100%;
    z-index: 9990;
    position: fixed;
    min-height: ${props => props.$isOverlayEnabled ? "100%" : "0"};
    height: ${props => props.$isOverlayEnabled ? "100%" : "0"};
`;

type ModalManagerProps = {
};

const ModalManager: React.FC<ModalManagerProps> = (props: ModalManagerProps) => {    
    const isOverlayEnabled: boolean = useAppSelector((state) => state.modal.isOverlayEnabled);
    const openModals: ModalState[] = useAppSelector((state) => state.modal.openModalStack);

    const dispatch = useAppDispatch();

    const closeModal = (modalName: string, data: any) => {
        dispatch(actions.modalActions.closeModal({modalName, data}));
    }

    const renderModals = () => {
        const modals: ReactNode[] = [];

        if (openModals.length === 0) {
            return null;
        }

        // Render each Modal in the stack
        for (let iter of openModals) {
            const modalState: ModalState = iter as ModalState;
            switch (modalState.modalName) {
                case NEW_POST_MODAL: {
                    modals.push(
                        <CreatePostModal 
                            key={NEW_POST_MODAL} 
                            onClose={() => closeModal(NEW_POST_MODAL, {})} />);
                    break;
                }
                case COMMENT_MODAL: {
                    modals.push(
                        <CommentModal 
                            key={COMMENT_MODAL}
                            post={modalState.data.post}
                            updatePost={() => null}
                            onClose={() => closeModal(COMMENT_MODAL, {})} />);
                    break;
                }
                default: {
                    console.warn("Invalid modal");
                    break;
                }
            }
        }

        return modals;
    }

    return (
        <>
            <ModalOverlay id="modalOverlay" $isOverlayEnabled={isOverlayEnabled} />
            {isOverlayEnabled && renderModals()}
        </>
    );
};

export default ModalManager;

/*

            {createPostModalVisible && <CreatePostModal onClose={() => {setCreatePostModalVisible(false); enableModal(false);}} />}            
            {viewLikesModalPost !== null && <LikesModal post={viewLikesModalPost} onClose={() => {setViewLikesModalPost(null)}}/>}
            {viewCommentModalPost !== null && <CommentModal updatePost={handleUpdateFromCommentModal} post={viewCommentModalPost} onClose={() => {setViewCommentModalPost(null)}}/>}                

export const enableModal = (enable: boolean) => {
    const cont = document.getElementById("modalContainer");
    const sectionCont = document.getElementById("mainSectionContainer");

    if (cont && sectionCont) {
        if (enable) {
            cont.style.height = "100%";
            sectionCont.style.pointerEvents = "none";
        }
        else {
            cont.style.height = "0%";
            sectionCont.style.pointerEvents = "auto";
        }
    }
}


*/