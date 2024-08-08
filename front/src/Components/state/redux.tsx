import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./reducers/rootReducer";
import { initialState } from "./store";

const store = configureStore({
    reducer: rootReducer,
    devTools: true,
    preloadedState: initialState,
  });
  
  export type AppDispatch = typeof store.dispatch;
  export type RootState = ReturnType<typeof store.getState>;
  
  export default store;
  