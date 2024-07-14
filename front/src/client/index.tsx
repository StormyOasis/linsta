import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { configureStore } from '@reduxjs/toolkit';

import App from '../common/App';
import {rootReducer, initialState} from '../common/state/store';

const rootElement = document.querySelector('#root');
if (!rootElement) 
    throw new Error('Failed to find root element');

const store = configureStore({
    reducer: rootReducer,
    devTools: true,
    preloadedState: initialState
  });

hydrateRoot(rootElement,   
  <React.StrictMode>
    <App store={store} initialState={
      initialState} />
  </React.StrictMode>
);