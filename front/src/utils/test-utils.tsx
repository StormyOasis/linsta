import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { RootState } from "../Components/Redux/redux";
import { authInitialState } from '../Components/Redux/slices/auth.slice';
import { modalInitialState } from '../Components/Redux/slices/modals.slice';
import { profileInitialState } from '../Components/Redux/slices/profile.slice';
import { miscInitialState } from '../Components/Redux/slices/misc.slice';
import { configureStore } from '@reduxjs/toolkit';

import Theme from '../Components/Themes/Theme';

export const mockInitialState = (overrides?: Partial<RootState>): RootState => ({
    auth: { ...authInitialState, ...(overrides?.auth ?? {}) },
    modal: { ...modalInitialState, ...(overrides?.modal ?? {}) },
    profile: { ...profileInitialState, ...(overrides?.profile ?? {}) },
    misc: { ...miscInitialState, ...(overrides?.misc ?? {}) },
});

type ExtendedRenderOptions = {
    store?: ReturnType<typeof configureStore>;
    preloadedState?: any;
    route?: string; // ← allow overriding the initial route
} & Omit<RenderOptions, "queries">;

const dummyAuthReducer = (state = { user: null, isLoading: false, error: null }, _action: any) => state;
const dummyModalReducer = (state = { isOpen: false }, _action: any) => state;
const dummyProfileReducer = (state = { name: '', email: '' }, _action: any) => state;
const dummyMiscReducer = (state = { someData: null }, _action: any) => state;

const renderWithStore = (
    ui: ReactElement,
    {
        preloadedState,
        store = configureStore({
            reducer: {
                auth: dummyAuthReducer,
                modal: dummyModalReducer,
                profile: dummyProfileReducer,
                misc: dummyMiscReducer,
            },
            preloadedState,
        }),
        route = "/",
        ...renderOptions
    }: ExtendedRenderOptions = {}
) => {
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        return (
            <Provider store={store}>
                <MemoryRouter initialEntries={[route]}>
                    <Theme>{children}</Theme>
                </MemoryRouter>
            </Provider>
        );
    };

    return {
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
        store,
    };
};

export * from "@testing-library/react";
export { renderWithStore };
export type { ExtendedRenderOptions };