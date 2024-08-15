import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignupMainForm, { SignupMainFormProps } from '../Flow/SignupMainForm';
import { MemoryRouter } from 'react-router-dom';


describe("Signup Main Form Component", () => {

    let props: SignupMainFormProps = {
        emailOrPhone: '',
        fullName: '',
        userName: '',
        password: '',
        emailOrPhone_valid: false,
        fullName_valid: false,
        userName_valid: false,
        password_valid: false,
        changePage: jest.fn(),
        handleFormChange: jest.fn()
    }

    it("should render correctly", () => {
        const r = render(<MemoryRouter><SignupMainForm {...props}/></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
        expect(screen.queryByTestId("submit-signupmain")?.hasAttribute("disabled")).toBeTruthy();
    });

    it("should validate all params and render correctly", () => {
        const oldProps = props;

        props.emailOrPhone = "a@a.com";
        props.fullName = "full name";
        props.password = "Pa$$w0rd!";
        props.userName = "username";
        props.emailOrPhone_valid = true;
        props.fullName_valid = true;
        props.userName_valid = true;
        props.password_valid = true;      

        const r = render(<MemoryRouter><SignupMainForm {...props}/></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();        
        expect(screen.queryByTestId("submit-signupmain")?.hasAttribute("disabled")).toBeFalsy();

        props = oldProps;
    })
});