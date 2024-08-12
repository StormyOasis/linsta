import React from 'react'
import renderer from 'react-test-renderer';
import { render, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom';
import Jest from 'jest';
import StyledLink from '../StyledLink';
import Theme from '../../Themes/Theme';
import { MemoryRouter } from 'react-router-dom';


test("StyledLink Component", () => {
    const r = render(
        <MemoryRouter>
            <Theme>
                <StyledLink to="/" onClick={() => true}>Hello</StyledLink>
            </Theme>
        </MemoryRouter>).asFragment();

    expect(r).toMatchSnapshot();
});

test("StyledLink Component With Style Override", () => {
    const styleOverride = { color: "red" };
    const r = render(
        <MemoryRouter>
            <Theme>
                <StyledLink to="/" onClick={() => true} styleOverride={styleOverride}>Hello</StyledLink>
            </Theme>
        </MemoryRouter>).asFragment();

    expect(r).toMatchSnapshot();
})


test("StyledLink Component no onclick", () => {
    const r = render(
        <MemoryRouter>
            <Theme>
                <StyledLink>Hello</StyledLink>
            </Theme>
        </MemoryRouter>).asFragment();

    expect(r).toMatchSnapshot();
})