import { configureStore} from '@reduxjs/toolkit';

import authSliceCreator from './slices/auth.slice';

export type Actions = {
  authActions?: any,
}

export const actions: Actions = {};

export const buildStore = (initialState?: any) => {
  const preloadedState:any = initialState == null ? {} : initialState;
  const {authActions, authReducer} = authSliceCreator(preloadedState.auth);

  actions.authActions = authActions;

  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    ...preloadedState
  });

  return store;
}

export type ConfiguredStore = ReturnType<typeof buildStore>;
export type StoreGetState = ConfiguredStore["getState"];
export type RootState = ReturnType<StoreGetState>;
export type AppDispatch = ConfiguredStore["dispatch"];