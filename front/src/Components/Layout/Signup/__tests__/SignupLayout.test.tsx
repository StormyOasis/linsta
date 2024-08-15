import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignupLayout from '../SignupLayout';
import { MemoryRouter } from 'react-router-dom';
import { buildStore } from '../../../../Components/Redux/redux';
import { Provider } from 'react-redux';
import Theme from '../../../../Components/Themes/Theme';


describe("Signup Layout Component", () => {

    it("should render step 1 correctly", () => {
        const store = buildStore();
        const r = render(<MemoryRouter><Provider store={store}><Theme><SignupLayout page={0}/></Theme></Provider></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
        expect(screen.queryByTestId("submit-signupmain")?.hasAttribute("disabled")).toBeTruthy();
    });

    it("should render step 2 correctly", () => {
        const store = buildStore();
        const r = render(<MemoryRouter><Provider store={store}><Theme><SignupLayout page={1}/></Theme></Provider></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
        expect(screen.queryByTestId("submit-signupbday")?.hasAttribute("disabled")).toBeTruthy();
    });    

    it("should render step 3 correctly", () => {
        const store = buildStore();
        const r = render(<MemoryRouter><Provider store={store}><Theme><SignupLayout page={2}/></Theme></Provider></MemoryRouter>).asFragment();
        expect(r).toMatchSnapshot();
        expect(screen.queryByTestId("submit-signupconfirm")?.hasAttribute("disabled")).toBeTruthy();
    });        
});