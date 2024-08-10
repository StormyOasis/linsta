import React from 'react'
import renderer from 'react-test-renderer';
import { render, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom';
import Jest from 'jest';
import StyledButton from '../StyledButton';
import Theme from '../../Themes/Theme';
import { MemoryRouter } from 'react-router-dom';


test("StyledButton Component", () => {
    const r = render(
        <MemoryRouter>
            <Theme>
                <StyledButton type="button" onClick={() => true} text="Hello"></StyledButton>
            </Theme>
        </MemoryRouter>).asFragment();

    expect(r).toMatchSnapshot();
});

test("StyledButton Component With Style Override", () => {
    const styleOverride = { color: "red" };
    const r = render(
        <MemoryRouter>
            <Theme>
                <StyledButton type="submit" text="Hello" onClick={() => true} style={styleOverride}></StyledButton>
            </Theme>
        </MemoryRouter>).asFragment();

    expect(r).toMatchSnapshot();
})