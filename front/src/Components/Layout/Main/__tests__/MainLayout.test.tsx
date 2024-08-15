import {render, fireEvent, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import { MainLayout } from '../MainLayout';

test("MainLayout", async () => {
    const r = render(<MainLayout>Hello</MainLayout>).asFragment();
    expect(r).toMatchSnapshot();
}); 