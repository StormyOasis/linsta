import { combineReducers } from "redux";
import logInReducer from "../../../Components/state/reducers/logInReducer";

export default combineReducers({
    isLoggedIn: logInReducer,
})