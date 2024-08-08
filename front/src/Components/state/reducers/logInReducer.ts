import { LOG_IN_USER_ACTION, LOG_OUT_USER_ACTION, ReduxAction } from "../actions/types";
import { initialState } from "../store";

export default (state = initialState, action:ReduxAction) => {
    switch(action.type) {
        case LOG_IN_USER_ACTION: {
            return {...state, isLoggedIn: true};
        }
        case LOG_OUT_USER_ACTION: {
            return {...state, isLoggedIn: false};
        }        
        default: {
            return state;
        }
    }
}