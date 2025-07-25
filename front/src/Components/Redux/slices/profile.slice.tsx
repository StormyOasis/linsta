import { ActionReducerMapBuilder, createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { historyUtils } from "../../../utils/utils";
import { Profile } from '../../../api/types';
import { postGetProfileByUserId, postGetProfileByUserName } from '../../../api/ServiceController';
import { DEFAULT_PFP } from '../../../api/config';

const NAME = "profile";

export interface GlobalProfileState {
    profile: Profile;
    nonce: string | null;
};

export const profileInitialState: GlobalProfileState = {
    profile: {
        userId: "0",
        userName: '',
        pfp: DEFAULT_PFP,
        profileId: ''
    },
    nonce: null
};

export const getProfileByUserId = createAsyncThunk(`${NAME}/getByUserId`, async (params: any, thunkApi) => {
    try {
        return await postGetProfileByUserId(params);
    } catch (err: any) {
        return thunkApi.rejectWithValue((err as Error).message);
    }
});

export const getProfileByUserName = createAsyncThunk(`${NAME}/getByUserName`, async (params: any, thunkApi) => {
    try {
        return await postGetProfileByUserName(params);
    } catch (err: any) {
        return thunkApi.rejectWithValue((err as Error).message);
    }
});

const profileSliceCreator = (preloadedState?: Partial<GlobalProfileState>) => {
    const initialState = createInitialState();
    const reducers = createReducers();

    function createInitialState() {
        if (historyUtils.isServer) {
            return { ...profileInitialState, ...preloadedState };
        }

        return {
            ...profileInitialState,
            ...preloadedState
        };
    }

    function createReducers() {
        const updateProfilePic = (state: GlobalProfileState, action: PayloadAction<string>) => {
            state.profile.pfp = action.payload as string;
        }

        const forceUpdate = (state: GlobalProfileState, _action: PayloadAction<string>) => {
            state.nonce = crypto.randomUUID();
        }

        return { updateProfilePic, forceUpdate };
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

        getProfileByUserIdReducer();
    }

    const slice = createSlice({ name: NAME, initialState, reducers, extraReducers });

    const profileActions = { ...slice.actions };
    const profileReducer = slice.reducer;

    return { profileActions, profileReducer };
}

export default profileSliceCreator;