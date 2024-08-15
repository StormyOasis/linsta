import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfirmationCodeForm, { ConfirmationCodeFormProps } from '../Flow/ConfirmationCodeForm';
import { MemoryRouter } from 'react-router-dom';
import { buildStore } from '../../../../Components/Redux/redux';
import { Provider } from 'react-redux';
import Theme from '../../../../Components/Themes/Theme';


describe("Signup Confirmation Form Component", () => {

    let props: ConfirmationCodeFormProps = {
        userName: '',
        fullName: '',
        emailOrPhone: '',
        password: '',
        confirmationCode: '',
        month: 0,
        day: 0,
        year: 0,
        confirmationCode_valid: false,
        handleFormChange: jest.fn(),
        changePage: jest.fn()
    }

    it("should render correctly", () => {
        const store = buildStore();
        const r = render(
            <MemoryRouter>
                <Provider store={store}>
                    <Theme>
                        <ConfirmationCodeForm {...props} />
                    </Theme>
                </Provider>
            </MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
        expect(screen.queryByTestId("submit-signupconfirm")?.hasAttribute("disabled")).toBeTruthy();
    });

    it("should validate all params and render correctly", () => {
        const oldProps = props;

        props.emailOrPhone = "a@a.com";
        props.fullName = "full name";
        props.password = "Pa$$w0rd!";
        props.userName = "username";
        props.confirmationCode_valid = true;
        props.month = 1;
        props.day = 1;
        props.year = 2011;
        props.confirmationCode = "abcde12";

        const store = buildStore();
        const r = render(
            <MemoryRouter>
                <Provider store={store}>
                    <Theme>
                        <ConfirmationCodeForm {...props} />
                    </Theme>
                </Provider>
            </MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
        expect(screen.queryByTestId("submit-signupconfirm")?.hasAttribute("disabled")).toBeFalsy();

        props = oldProps;
    })
});