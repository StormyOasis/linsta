import { configureStore } from "@reduxjs/toolkit";

export type Store = {
  version: string;
};

export const initialState: Store = {
  version: "1.0.0",
};

export function rootReducer(state = initialState, event: any) {
  return state;
}

const store = configureStore({
  reducer: {
    version: (state = initialState, action) => {
      return state;
    },
  },
  devTools: true,
  preloadedState: initialState,
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export default store;
