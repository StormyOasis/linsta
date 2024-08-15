import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BirthdayForm, { BirthdayFormProps } from '../Flow/BirthdayForm';


describe("Birthday Component", () => {

    let props: BirthdayFormProps = {
        month: 1,
        day: 1,
        year: 2011,
        date_valid: false,
        showBirthdayModal: false,
        changePage: jest.fn(),
        changeState: jest.fn(),
        handleFormChange: jest.fn()
    }

    it("should render correctly", () => {
        const r = render(<BirthdayForm {...props}/>).asFragment();
        expect(r).toMatchSnapshot();
    });

    it("should render with birthday modal", () => {
        props.showBirthdayModal = true;
        
        const r = render(<BirthdayForm {...props}/>).asFragment();
        expect(r).toMatchSnapshot();     
        expect(screen.getByTitle('data-modal-close')).toBeDefined();

        props.showBirthdayModal = false;   
    })
});