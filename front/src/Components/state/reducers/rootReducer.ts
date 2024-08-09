import { combineReducers } from "redux";
import logInReducer from "/src/Components/state/reducers/logInReducer";

export default combineReducers({
    isLoggedIn: logInReducer,
})