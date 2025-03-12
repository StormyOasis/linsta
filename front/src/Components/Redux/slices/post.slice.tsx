import { ActionReducerMapBuilder, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { historyUtils, togglePostLikedState } from "../../../utils/utils";
import { Post } from '../../../api/types';
import { getPosts, postToggleLike } from '../../../api/ServiceController';

const NAME = "post";

export interface GlobalPostState {
    posts: Post[];    
};

const defaultState:GlobalPostState = {
    posts: []
};

export const getPostList = createAsyncThunk(`${NAME}/getPosts`, async (_params, thunkApi) => {    
    try {
        return await getPosts();
    } catch (err: any) {
        return thunkApi.rejectWithValue(err.message);
    }
});

export const togglePostLike = createAsyncThunk(`${NAME}/toggleLike`, async (params: any, thunkApi) => {    
    try {
        const result = await postToggleLike(params);
        if(result.status === 200) {
            return result.data;
        } 
        return false;
    } catch (err: any) {
        return thunkApi.rejectWithValue(err.message);
    }
});

const postSliceCreator = (preloadedState?: any) => {    
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
        return {};
    }

    function createActions() {
        return {};
    }

    const extraReducers = (builder: ActionReducerMapBuilder<any>) => {
        function getPostListReducer() {
            builder.addCase(getPostList.pending, (state) => {
                state.status = "pending";
                state.error = null;
                state.posts = null;                
            }).addCase(getPostList.fulfilled, (state, action) => {
                const posts = action.payload.data;
                state.status = "succeeded";
                state.error = null;
                state.posts = posts;
            }).addCase(getPostList.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message;
                state.posts = null;
            })
        }

        function toggleLikeReducer() {
            builder.addCase(togglePostLike.pending, (state) => {
                state.status = "pending";
                state.error = null;        
            }).addCase(togglePostLike.fulfilled, (state, action) => {
                const {userId, userName, postId} = action.meta.arg;

                // Find the post in the list and update it with the new like state                
                state.posts = state.posts.map((post:Post) => {
                    if(post.postId === postId) {
                        // Found the post in the list
                        // Now update the state                        
                        return togglePostLikedState(userName, userId, post);
                    }   
                    return post;
                });

                state.status = "succeeded";
                state.error = null;                                
            }).addCase(togglePostLike.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message;
            })
        }        

        getPostListReducer();        
        toggleLikeReducer();
    }

    const slice = createSlice({ name: NAME, initialState, reducers, extraReducers });

    const postActions = { ...slice.actions, ...actions };
    const postReducer = slice.reducer;

    return { postActions, postReducer };
}

export default postSliceCreator;