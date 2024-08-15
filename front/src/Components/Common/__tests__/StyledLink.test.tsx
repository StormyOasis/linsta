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


test("StyledLink Component with click", async () => {
    const cb = jest.fn();
    const r = render(
        <MemoryRouter>
            <Theme>
                <StyledLink datatestid="styledlink-click" onClick={cb}>Hello</StyledLink>
            </Theme>
        </MemoryRouter>).asFragment();

    let element = screen.queryByTestId("styledlink-click");
    expect(element).toBeDefined();
    if(element) {
        await userEvent.click(element);
        expect(r).toMatchSnapshot();
        expect(cb).toHaveBeenCalled();
    }

})