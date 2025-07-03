import React from "react";
import { styled } from "styled-components";

import * as styles from '../../../Components/Common/CombinedStyling';

import Theme from "../../../Components/Themes/Theme";
import SignupMainForm from "../../../Components/Layout/Signup/Flow/SignupMainForm";
import BirthdayForm from "../../../Components/Layout/Signup/Flow/BirthdayForm";
import ConfirmationCodeForm from "../../../Components/Layout/Signup/Flow/ConfirmationCodeForm";
import StyledLink from "../../../Components/Common/StyledLink";
import { Div } from "../../../Components/Common/CombinedStyling";

type SignupLayoutProps = {
    page?: number | null
};

type SignupState = {
    userName: string;
    fullName: string;
    emailOrPhone: string;
    password: string;
    confirmationCode: string;

    month: number;
    day: number;
    year: number;

    userName_valid: boolean;
    fullName_valid: boolean;
    emailOrPhone_valid: boolean;
    password_valid: boolean;
    year_valid: boolean;
    confirmationCode_valid: boolean;

    signupPage: number;
    showBirthdayModal: boolean;
};

const SignupLayoutWrapper = styled.main<any>`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

export default class SignupLayout extends React.Component<
    SignupLayoutProps,
    SignupState
> {
    constructor(props: SignupLayoutProps) {
        super(props);

        this.state = {
            userName: "",
            fullName: "",
            emailOrPhone: "",
            password: "",
            confirmationCode: "",

            month: 1,
            day: 1,
            year: new Date().getFullYear(),

            userName_valid: false,
            fullName_valid: false,
            emailOrPhone_valid: false,
            password_valid: false,
            confirmationCode_valid: false,
            year_valid: false,
            signupPage: props.page ? props.page : 0,
            showBirthdayModal: false
        };
    }

    changePage = (changeValue: number) => {
        let newPage = this.state.signupPage + changeValue;
        if (newPage < 0) {
            newPage = 0;
        } else if (newPage > 2) {
            newPage = 2;
        }

        this.setState({ signupPage: newPage }, () => { this.forceUpdate() });
    }

    changeState = (key: string, value: any) => {
        this.setState({
            ...this.state,
            [key]: value
        });
    }

    handleFormChange = (key: string, value: string, valid: boolean) => {
        this.setState({
            ...this.state,
            [key]: value,
            [key + "_valid"]: valid,
        });        
    }

    renderPage = () => {
        if (this.state.signupPage == 0) {
            return <SignupMainForm 
                emailOrPhone={this.state.emailOrPhone} 
                fullName={this.state.fullName} 
                userName={this.state.userName} 
                password={this.state.password}
                emailOrPhone_valid={this.state.emailOrPhone_valid}
                fullName_valid={this.state.fullName_valid}
                userName_valid={this.state.userName_valid}
                password_valid={this.state.password_valid}
                changePage={this.changePage}
                handleFormChange={this.handleFormChange}
                />
        } else if (this.state.signupPage == 1) {
            return <BirthdayForm 
                changePage={this.changePage} 
                changeState={this.changeState}                 
                handleFormChange={this.handleFormChange} 
                showBirthdayModal={this.state.showBirthdayModal} 
                date_valid={this.state.year_valid} 
                day={this.state.day} 
                month={this.state.month} 
                year={this.state.year} />;
        } else if (this.state.signupPage == 2) {
            return <ConfirmationCodeForm 
                confirmationCode={this.state.confirmationCode} 
                confirmationCode_valid={this.state.confirmationCode_valid} 
                emailOrPhone={this.state.emailOrPhone} 
                fullName={this.state.fullName} 
                userName={this.state.userName} 
                password={this.state.password}
                day={this.state.day} 
                month={this.state.month} 
                year={this.state.year}                 
                handleFormChange={this.handleFormChange} 
                changePage={this.changePage}/>
        }
        return <></>;
    }

    override render() {
        return (
            <Theme>
                <SignupLayoutWrapper role="main">
                    <div className={styles.default.innerDiv1}>
                        <div className={styles.default.innerDiv2}>
                            <div className={styles.default.signupBox}>
                                {this.renderPage()}
                            </div>
                            <div
                                className={styles.default.signupBox}
                                style={{ padding: "20px 0" }}>
                                    Have an account? <StyledLink to="/login">Log In</StyledLink>
                            </div>
                        </div>
                    </div>
                    <Div $margin="auto">
                        <StyledLink to="/about" styleOverride={{fontSize: ".925em", fontWeight: 600}}>                            
                            About
                        </StyledLink>                     
                    </Div>                    
                </SignupLayoutWrapper>
            </Theme>
        );
    }
}
