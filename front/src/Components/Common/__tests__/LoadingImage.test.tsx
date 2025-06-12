import React from 'react'
import '@testing-library/jest-dom';
import LoadingImage from '../LoadingImage';
import { renderWithStore } from '../../../utils/test-utils';


describe("LoadingImage Component", () => {
    it("renders correctly when isLoading is false", () => {
        const r = renderWithStore(<LoadingImage isLoading={false} />)
        expect(r).toMatchSnapshot();
    });

    it("renders correctly when isLoading is true", () => {
        const r = renderWithStore(<LoadingImage isLoading={true} />)
        expect(r).toMatchSnapshot();
    });    
})