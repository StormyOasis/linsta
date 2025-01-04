import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

import authSliceCreator from './slices/auth.slice';
import modalSliceCreator from './slices/modals.slice';

export type Actions = {
  authActions?: any,
  modalActions?: any;
}

export const actions: Actions = {};

export const buildStore = (initialState?: any) => {
  const preloadedState:any = initialState == null ? {} : initialState;
  const {authActions, authReducer} = authSliceCreator(preloadedState.auth);
  const {modalActions, modalReducer} = modalSliceCreator(preloadedState.modal);

  actions.authActions = authActions;
  actions.modalActions = modalActions;

  const store = configureStore({
    devTools: true,
    reducer: {
      auth: authReducer,
      modal: modalReducer
    },
    ...preloadedState
  });

  return store;
}

export type ConfiguredStore = ReturnType<typeof buildStore>;
export type StoreGetState = ConfiguredStore["getState"];
export type RootState = ReturnType<StoreGetState>;
export type AppDispatch = ConfiguredStore["dispatch"];

// Use throughout instead `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();