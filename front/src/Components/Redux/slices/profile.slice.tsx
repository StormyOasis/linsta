import { ActionReducerMapBuilder, createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { historyUtils } from "../../../utils/utils";
import { Profile } from '../../../api/types';
import { postGetProfileByUserId, postGetProfileByUserName  } from '../../../api/ServiceController';
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

export const getProfileByUserName = createAsyncThunk(`${NAME}/getByUserName`, async (params: any, thunkApi) => {    
    try {
        return await postGetProfileByUserName(params);
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
        const updateProfilePic = (state: GlobalProfileState, action: PayloadAction<string>) => {         
            state.profile.pfp = action.payload as string;
        }
                
        return {updateProfilePic};
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
        };

        builder.addCase(getProfileByUserName.fulfilled, (state, action) => {
            const profile: Profile = action.payload.data as Profile;
            state.profile = profile;
        })
        
        getProfileByUserIdReducer();
    }

    const slice = createSlice({ name: NAME, initialState, reducers, extraReducers });

    const profileActions = { ...slice.actions, ...actions };
    const profileReducer = slice.reducer;

    return { profileActions, profileReducer };
}

export default profileSliceCreator;