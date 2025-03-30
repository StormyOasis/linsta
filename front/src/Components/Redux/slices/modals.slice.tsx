import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { historyUtils } from "../../../utils/utils";

const NAME = "modals";

export const MODAL_TYPES = {
    NEW_POST_MODAL: "newPostModal",
    COMMENT_MODAL: "commentModal",
    LIKES_MODAL: "likeModal",
    PROFILE_PIC_MODAL: "pfpModal",
    FOLLOW_MODAL: "followModal"
};

export interface ModalState {
    modalName: string;
    data: any;
};

export interface GlobalModalState {
    openModalStack: ModalState[];
    isOverlayEnabled: boolean;
};

const defaultState:GlobalModalState = {
    openModalStack: [],
    isOverlayEnabled: false,    
};

const modalSliceCreator = (preloadedState?: Partial<GlobalModalState>) => {    
    const initialState = createInitialState();
    const reducers = createReducers();

    function createInitialState() {
        if (historyUtils.isServer) {
            return {...defaultState, ...preloadedState};
        }

        return {
            ...defaultState,            
            ...preloadedState
        };
    }

    function createReducers() {
        const openModal = (state: GlobalModalState, action: PayloadAction<ModalState>) => {
            const {modalName, data} = action.payload;

            // Make sure it's not already open
            for(let modalState of state.openModalStack) {
                if(modalState.modalName === modalName) {
                    return;
                }
            }

            // Turn on the overlay background
            state.isOverlayEnabled = true;            

            // Add the modal to the stack
            state.openModalStack.push({modalName, data});
        };

        const closeModal = (state: GlobalModalState, action: PayloadAction<ModalState>) => {
            const {modalName} = action.payload;
            // Make sure it's actually open and if so, mark it as closed
            // Mark the modal as closed by removing it from the stack. 
            // The actual closing callback will happen in the modal manager            
            state.openModalStack = state.openModalStack
                .filter((val:ModalState, _idx: number, _arr: ModalState[]) => val.modalName !== modalName);

            // Turn off the overlay background if necessary and clear the current post state
            if(state.openModalStack.length === 0) {                
                state.isOverlayEnabled = false;
            }
        };

        const updateModalData = (state: GlobalModalState, action: PayloadAction<ModalState>) => {
            const { modalName, data } = action.payload;
            const modal = state.openModalStack.find((modal) => modal.modalName === modalName);
            if (modal) {
                modal.data = data; // Update the data for the specific modal
            }
        };        

        return {
            openModal,
            closeModal,
            updateModalData
        };
    }

    const slice = createSlice({ name: NAME, initialState, reducers });
    const modalActions = { ...slice.actions };
    const modalReducer = slice.reducer;

    return { modalActions, modalReducer };
}

export default modalSliceCreator;