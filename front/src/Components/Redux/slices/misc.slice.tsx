import { ActionReducerMapBuilder, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { historyUtils } from "../../../utils/utils";
import { Post } from '../../../api/types';

const NAME = "misc";

export interface GlobalMiscState {
    deletedCommentId: string | null,
    deletedPostId: string | null,
    updatedPost: Post | null
};

const defaultState: GlobalMiscState = {
    deletedCommentId: null,
    deletedPostId: null,
    updatedPost: null
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

        const updateDeletedPostId = (state: GlobalMiscState, action: PayloadAction<string>) => {
            state.deletedPostId = action.payload as string;
        }        

        const updateUpdatedPost = (state: GlobalMiscState, action: PayloadAction<Post>) => {
            state.updatedPost = action.payload as Post;
        }                

        return { updateDeletedCommentId, updateDeletedPostId, updateUpdatedPost };
    }

    const extraReducers = (_builder: ActionReducerMapBuilder<any>) => {}

    const slice = createSlice({ name: NAME, initialState, reducers, extraReducers });

    const miscActions = { ...slice.actions };
    const miscReducer = slice.reducer;

    return { miscActions, miscReducer };
}

export default miscSliceCreator;