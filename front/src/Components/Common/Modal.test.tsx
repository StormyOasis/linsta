import React from 'react'
import renderer from 'react-test-renderer';
import {render, fireEvent, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom';
import Jest from 'jest';
import Modal from './Modal';


test("Modal Component", () => {
    const r = render(<Modal title="Test Modal" onClose={()=> true}>Hello</Modal>).asFragment();
    expect(r).toMatchSnapshot();
})

test("Modal Close", async () => {
    let cb = jest.fn();
    const r = render(<Modal title="Test Modal" onClose={cb}>Hello</Modal>).asFragment();
  
    await userEvent.click(screen.getByTitle('data-modal-close'));
    expect(cb).toHaveBeenCalled();
})