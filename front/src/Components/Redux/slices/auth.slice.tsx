import { ActionReducerMapBuilder, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {logout, login} from '../../../api/Auth';
import { historyUtils } from "../../../utils/utils";

const name = "auth";
const initialState = createInitialState();
const reducers = createReducers();
const actions = createActions();

const defaultState = {
    user: {},
    error: null,
    status: ""    
};

function createInitialState() {
    if(historyUtils.isServer) {
        return {...defaultState};
    }

    
    return {
        ...defaultState,
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
    const loginUser = () => {
        return createAsyncThunk(`${name}/login`, async ({userName, password}:any, thunkApi) => {
            try {
                return await login(userName, password);
            } catch(err: any) {                
                return thunkApi.rejectWithValue(err.message);
            }
        });
    } 
    
    return {
        login: loginUser()
    };
}

const extraReducers = (builder: ActionReducerMapBuilder<any>) => {
    function loginUser() {
        builder.addCase(actions.login.pending, (state) => {
            state.status = "pending";
            state.error = null;
        }).addCase(actions.login.fulfilled, (state, action) => {
            const user = action.payload;
            localStorage.setItem("user", JSON.stringify(user));
            state.user = user;
            state.status = "succeeded";
            state.error = null;

            historyUtils.navigate("/");            
        }).addCase(actions.login.rejected, (state, action) => {
            state.status = "failed";
            state.error = action.error.message;
        })
    }

    loginUser();
}

const slice = createSlice({ name, initialState, reducers, extraReducers});

export const authActions = { ...slice.actions, ...actions };
export const authReducer = slice.reducer;