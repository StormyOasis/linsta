import { ActionReducerMapBuilder, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { logout, login } from '../../../api/Auth';
import { historyUtils } from "../../../utils/utils";

const NAME = "auth";

export const authInitialState = {
    user: {},
    error: null,
    status: ""
};

export const loginUser = createAsyncThunk(`${NAME}/login`, async ({ userName, password }: any, thunkApi) => {
    try {
        return await login(userName, password);
    } catch (err: any) {
        return thunkApi.rejectWithValue(err.message);
    }
});

const authSliceCreator = (preloadedState?: any) => {    
    const initialState = createInitialState();
    const reducers = createReducers();

    function createInitialState() {
        if (historyUtils.isServer) {
            return {...authInitialState, ...preloadedState};
        }

        return {
            ...authInitialState,            
            ...preloadedState,            
            user: JSON.parse(localStorage.getItem('user') as string),
        };
    }

    function createReducers() {
        const logoutUser = (state: any) => {
            state.user = null;
            state.error = null;
            state.status = "";
            logout();
            historyUtils.navigate("/login");
        }

        return {
            logoutUser
        };
    }

    const extraReducers = (builder: ActionReducerMapBuilder<any>) => {
        builder.addCase(loginUser.pending, (state) => {
            state.status = "pending";
            state.error = null;
        }).addCase(loginUser.fulfilled, (state, action) => {
            const user = action.payload;
            localStorage.setItem("user", JSON.stringify(user));
            state.user = user;
            state.status = "succeeded";
            state.error = null;

            historyUtils.navigate("/");
        }).addCase(loginUser.rejected, (state, action) => {
            state.status = "failed";
            state.error = action.error.message;
        });
    }

    const slice = createSlice({ name: NAME, initialState, reducers, extraReducers });

    const authActions = { ...slice.actions };
    const authReducer = slice.reducer;

    return { authActions, authReducer };
}

export default authSliceCreator;