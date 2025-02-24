import React, { ReactNode } from "react";
import { styled } from "styled-components";
import { Div, Flex } from "../../../Common/CombinedStyling";
import { actions, useAppDispatch, useAppSelector } from "../../../../Components/Redux/redux";
import { COMMENT_MODAL, LIKES_MODAL, ModalState, NEW_POST_MODAL, PROFILE_PIC_MODAL, FOLLOWERS_MODAL } from "../../../../Components/Redux/slices/modals.slice";
import CreatePostModal from "./CreatePost/CreatePostModal";
import CommentModal from "./Comments/CommentsModal";
import LikesModal from "./Main/LikesModal";
import { Post, Profile } from "../../../../api/types";
import { getPostFromListById } from "../../../../utils/utils";
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

type ModalManagerProps = {
};

const ModalManager: React.FC<ModalManagerProps> = (_props: ModalManagerProps) => {
    const posts: Post[] = useAppSelector((state) => state.post.posts);
    const profile: Profile = useAppSelector((state) => state.profile.profile);
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
        let zIndex = MODAL_ZINDEX_BASE;
        for (let iter of openModals) {
            const modalState: ModalState = iter as ModalState;            
            switch (modalState.modalName) {
                case NEW_POST_MODAL: {
                    modals.push(                        
                        <CreatePostModal                             
                            key={NEW_POST_MODAL} 
                            zIndex={zIndex}
                            onClose={() => closeModal(NEW_POST_MODAL, {})} />);
                    break;
                }
                case COMMENT_MODAL: {
                    modals.push(
                        <CommentModal 
                            key={COMMENT_MODAL}
                            zIndex={zIndex}
                            post={getPostFromListById(modalState.data.postId, posts)}
                            onClose={() => closeModal(COMMENT_MODAL, {})} />);                        
                    break;
                }
                case LIKES_MODAL: {
                    modals.push(
                        <LikesModal 
                            key={LIKES_MODAL}
                            zIndex={zIndex}
                            post={getPostFromListById(modalState.data.postId, posts)}
                            onClose={() => closeModal(LIKES_MODAL, {})} />);
                    break;
                }       
                case PROFILE_PIC_MODAL: {
                    modals.push(
                        <PfpModal 
                            key={PROFILE_PIC_MODAL}
                            zIndex={zIndex}
                            profile={profile}
                            onClose={() => closeModal(PROFILE_PIC_MODAL, {})} />);
                    break;
                }
                case FOLLOWERS_MODAL: {
                    modals.push(
                        <FollowersModal 
                            key={FOLLOWERS_MODAL}
                            zIndex={zIndex}
                            profile={profile}
                            onClose={() => closeModal(FOLLOWERS_MODAL, {})} />);
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