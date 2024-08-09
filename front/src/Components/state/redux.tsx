import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "/src/Components/state/reducers/rootReducer";
import { initialState } from "/src/Components/state/store";

const store = configureStore({
    reducer: rootReducer,
    devTools: true,
    preloadedState: initialState,
  });
  
  export type AppDispatch = typeof store.dispatch;
  export type RootState = ReturnType<typeof store.getState>;
  
  export default store;
  