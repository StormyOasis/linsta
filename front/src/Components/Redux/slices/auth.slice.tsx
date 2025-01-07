import { ActionReducerMapBuilder, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { logout, login } from '../../../api/Auth';
import { historyUtils } from "../../../utils/utils";

const NAME = "auth";

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
    const actions = createActions();

    const defaultState = {
        user: {},
        error: null,
        status: ""
    };

    function createInitialState() {
        if (historyUtils.isServer) {
            return {...defaultState, ...preloadedState};
        }

        return {
            ...defaultState,            
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
            historyUtils.navigate("/");
        }

        return {
            logoutUser
        };
    }

    function createActions() {
        return {};
    }

    const extraReducers = (builder: ActionReducerMapBuilder<any>) => {
        function login() {
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
            })
        }

        login();
    }

    const slice = createSlice({ name: NAME, initialState, reducers, extraReducers });

    const authActions = { ...slice.actions, ...actions };
    const authReducer = slice.reducer;

    return { authActions, authReducer };
}

export default authSliceCreator;