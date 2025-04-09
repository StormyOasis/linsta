import { ActionReducerMapBuilder, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { historyUtils } from "../../../utils/utils";

const NAME = "misc";

export interface GlobalMiscState {
    deletedCommentId: string | null    
};

const defaultState: GlobalMiscState = {
    deletedCommentId: null
};

const miscSliceCreator = (preloadedState?: Partial<GlobalMiscState>) => {
    const initialState = createInitialState();
    const reducers = createReducers();

    function createInitialState() {
        if (historyUtils.isServer) {
            return { ...defaultState, ...preloadedState };
        }

        return {
            ...defaultState,
            ...preloadedState
        };
    }

    function createReducers() {
        const updateDeletedCommentId = (state: GlobalMiscState, action: PayloadAction<string>) => {
            state.deletedCommentId = action.payload as string;
        }

        return { updateDeletedCommentId };
    }

    const extraReducers = (_builder: ActionReducerMapBuilder<any>) => {}

    const slice = createSlice({ name: NAME, initialState, reducers, extraReducers });

    const miscActions = { ...slice.actions };
    const miscReducer = slice.reducer;

    return { miscActions, miscReducer };
}

export default miscSliceCreator;