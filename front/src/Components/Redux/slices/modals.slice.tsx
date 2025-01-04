import { ActionReducerMapBuilder, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { historyUtils } from "../../../utils/utils";

export const NEW_POST_MODAL = "newPostModal";
export const COMMENT_MODAL = "commentModal";

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
    isOverlayEnabled: false
};

const modalSliceCreator = (preloadedState?: any) => {
    const name = "modals";
    const initialState = createInitialState();
    const reducers = createReducers();
    const actions = createActions();

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

            // Turn off the overlay background if necessary
            if(state.openModalStack.length === 0) {
                state.isOverlayEnabled = false;
            }
        };

        return {
            openModal,
            closeModal
        };
    }

    function createActions() {
        return {};
    }

    const extraReducers = (_builder: ActionReducerMapBuilder<any>) => {
    }

    const slice = createSlice({ name, initialState, reducers, extraReducers });

    const modalActions = { ...slice.actions, ...actions };
    const modalReducer = slice.reducer;

    return { modalActions, modalReducer };
}

export default modalSliceCreator;