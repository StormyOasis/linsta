import { configureStore } from "@reduxjs/toolkit";

export type Store = {  
  isLoggedIn: boolean;
};

export const initialState: Store = {
  isLoggedIn: false,
};

export function rootReducer(state = initialState, event: any) {
  return state;
}

const store = configureStore({
  reducer: {
    isLoggedIn: (state = initialState, action) => {
      return state;
    },
  },
  devTools: true,
  preloadedState: initialState,
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export default store;
