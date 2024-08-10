import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "../../Components/state/reducers/rootReducer";
import { initialState } from "../../Components/state/store";

const store = configureStore({
    reducer: rootReducer,
    devTools: true,
    preloadedState: initialState,
  });
  
  export type AppDispatch = typeof store.dispatch;
  export type RootState = ReturnType<typeof store.getState>;
  
  export default store;
  