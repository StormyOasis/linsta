import React, { ReactNode } from "react";
import { styled } from "styled-components";
import { Flex } from "../../../Common/CombinedStyling";
import { actions, useAppDispatch, useAppSelector } from "../../../../Components/Redux/redux";
import { COMMENT_MODAL, LIKES_MODAL, ModalState, NEW_POST_MODAL } from "../../../../Components/Redux/slices/modals.slice";
import CreatePostModal from "./CreatePost/CreatePostModal";
import CommentModal from "./Comments/CommentsModal";
import LikesModal from "./Main/LikesModal";
import { Post } from "../../../../api/types";
import { getPostFromListById } from "../../../../utils/utils";

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

const ModalManager: React.FC<ModalManagerProps> = (_props: ModalManagerProps) => {
    const posts: Post[] = useAppSelector((state) => state.post.posts);
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
                            post={getPostFromListById(modalState.data.postId, posts)}
                            onClose={() => closeModal(COMMENT_MODAL, {})} />);
                    break;
                }
                case LIKES_MODAL: {
                    modals.push(
                        <LikesModal 
                            key={LIKES_MODAL}
                            post={getPostFromListById(modalState.data.postId, posts)}
                            onClose={() => closeModal(LIKES_MODAL, {})} />);
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