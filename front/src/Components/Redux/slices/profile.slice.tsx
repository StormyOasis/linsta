import { ActionReducerMapBuilder, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { historyUtils } from "../../../utils/utils";
import { Profile } from '../../../api/types';
import { postGetProfileByUserId  } from '../../../api/ServiceController';
import { DEFAULT_PFP } from '../../../api/config';

const NAME = "profile";

export interface GlobalProfileState {
    profile: Profile;    
};

const defaultState:GlobalProfileState = {
    profile: {
        userId: 0,
        userName: '',
        pfp: DEFAULT_PFP
    }
};

export const getProfileByUserId = createAsyncThunk(`${NAME}/getByUserId`, async (params: any, thunkApi) => {    
    try {
        return await postGetProfileByUserId(params);
    } catch (err: any) {
        return thunkApi.rejectWithValue(err.message);
    }
});

const profileSliceCreator = (preloadedState?: any) => {    
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
        function getProfileByUserIdReducer() {
            builder.addCase(getProfileByUserId.pending, (state) => {
                state.status = "pending";
                state.error = null;
                state.profile = null;                
            }).addCase(getProfileByUserId.fulfilled, (state, action) => {
                const profile = action.payload.data;
                state.status = "succeeded";
                state.error = null;
                state.profile = profile;
            }).addCase(getProfileByUserId.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message;
                state.profile = null;
            });            
        }
        
        getProfileByUserIdReducer();
    }

    const slice = createSlice({ name: NAME, initialState, reducers, extraReducers });

    const profileActions = { ...slice.actions, ...actions };
    const profileReducer = slice.reducer;

    return { profileActions, profileReducer };
}

export default profileSliceCreator;