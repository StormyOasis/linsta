import React from 'react'
import renderer from 'react-test-renderer';
import { render, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom';
import Jest from 'jest';
import StyledInput from '../StyledInput';
import Theme from '../../Themes/Theme';
import { MemoryRouter } from 'react-router-dom';


test("StyledInput Component", () => {
    const r = render(
        <MemoryRouter>
            <Theme>
                <StyledInput type="button" onChange={() => true} name="name"></StyledInput>
            </Theme>
        </MemoryRouter>).asFragment();

    expect(r).toMatchSnapshot();
});

test("StyledInput Component validation true", () => {
    const r = render(
        <MemoryRouter>
            <Theme>
                <StyledInput name="name" type="password" onChange={() => true} isValid={true}></StyledInput>
            </Theme>
        </MemoryRouter>).asFragment();

    expect(r).toMatchSnapshot();
});

test("StyledInput Component With Style Override", () => {
    const styleOverride = { color: "red" };
    const r = render(
        <MemoryRouter>
            <Theme>
                <StyledInput name="name" onChange={() => true} style={styleOverride}></StyledInput>
            </Theme>
        </MemoryRouter>).asFragment();

    expect(r).toMatchSnapshot();
})