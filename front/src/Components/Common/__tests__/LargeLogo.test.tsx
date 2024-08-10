import React from 'react'
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';
import LargeLogo from '../LargeLogo';
import { MemoryRouter } from 'react-router-dom';


test("LargeLogo Component", () => {
    const r = render(<MemoryRouter><LargeLogo></LargeLogo></MemoryRouter>).asFragment();
    expect(r).toMatchSnapshot();
})