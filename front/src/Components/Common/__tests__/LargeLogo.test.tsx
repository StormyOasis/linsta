import React from 'react'
import '@testing-library/jest-dom';
import LargeLogo from '../LargeLogo';
import { renderWithStore } from '../../../utils/test-utils';

describe("LargeLogo Component", () => {
    it("renders correctly", () => {
        const r = renderWithStore(<LargeLogo />)
        expect(r).toMatchSnapshot();
    })
})