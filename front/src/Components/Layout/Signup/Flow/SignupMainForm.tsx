import React from "react";
import { styled } from "styled-components";
import * as styles from "/src/Components/Common/CombinedStyling";
import Theme from "/src/Components/Themes/Theme";
import {postAccountsAttempt, getAccountsCheckUserUnique} from "/src/api/ServiceController";
import StyledInput from "/src/Components/Common/StyledInput";
import StyledButton from "/src/Components/Common/StyledButton";
import LargeLogo from "/src/Components/Common/LargeLogo";
import LoginWithFB from "/src/Components/Common/LoginWithFB";
import { validatePassword } from "/src/utils/utils";

const SignupForm = styled.form`
  display: flex;
  flex-direction: column;
  margin: 0;
  max-width: 350px;
  vertical-align: baseline;
`;

type MainSignupFormProps = {
    emailOrPhone: string;
    fullName: string;
    userName: string;
    password: string;
    emailOrPhone_valid: boolean;
    fullName_valid: boolean;
    userName_valid: boolean;
    password_valid: boolean;
    changePage: any;
    handleFormChange: any;
};

export default class MainSignupForm extends React.Component<MainSignupFormProps> {
    loginWithFacebookClicked = (event: React.MouseEventHandler<HTMLButtonElement>) => {
        window.alert("todo");
    };

    validateEmailPhone = (value: string): boolean => {
        if (value == null) {
            return false;
        }

        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        const emailRegex =
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        return emailRegex.test(value) || phoneRegex.test(value);
    };

    validateFullName = (value: string): boolean => {
        return (
            value !== null &&
            value.trim().length > 0 &&
            value.trim().split(" ").length > 1
        );
    };

    validateUserName = async (value: string): Promise<boolean> => {
        if (value == null || value.length == 0) 
            return false;

        const response = await getAccountsCheckUserUnique(value);

        return !response.data;
    };

    validateField = (event: React.ChangeEvent<HTMLInputElement>): boolean => {
        let result = false;
        switch (event.target.name) {
            case "emailOrPhone": {
                result = this.validateEmailPhone(event.target.value);
                break;
            }
            case "fullName": {
                result = this.validateFullName(event.target.value);
                break;
            }
            case "password": {
                result = validatePassword(event.target.value);
                break;
            }
        }

        return result;
    };

    handleFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.props.handleFormChange(
            event.target.name,
            event.target.value,
            this.validateField(event)
        );
    };

    handleUsernameFormChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = event.target.value;
        const name = event.target.name;

        await this.validateUserName(value)
            .then((res) => {
                this.props.handleFormChange(name, value, !res);
            })
            .catch(() => {
                this.props.handleFormChange(name, value, false);
            });
    };

    isFormValid = (): boolean => {
        return (
            this.props.emailOrPhone_valid &&
            this.props.fullName_valid &&
            this.props.password_valid &&
            this.props.userName_valid
        );
    };

    submitForm = async (event: React.ChangeEvent<HTMLButtonElement>) => {
        event?.preventDefault();

        if (!this.isFormValid()) {
            return false;
        }

        const res = await postAccountsAttempt({
            dryRun: true,
            emailOrPhone: this.props.emailOrPhone,
            userName: this.props.userName,
            fullName: this.props.fullName,
            password: this.props.password,
        });

        if (res.statusText === "OK") {
            this.props.changePage(1);
            return true;
        }

        return false;
    };

    override render() {
        return (
            <Theme>
                <LargeLogo />
                <div>
                    <SignupForm method="post">
                        <div className={styles.default.signupFormDiv1}>
                            <span className={styles.default.signupIntroSpan}>
                                Sign up to see photos and videos from your friends.
                            </span>
                        </div>
                        <LoginWithFB>Login in with Facebook</LoginWithFB>
                        <StyledInput
                            name="emailOrPhone"
                            placeholder="Phone Number or Email"
                            value={this.props.emailOrPhone}
                            isValid={this.props.emailOrPhone_valid}
                            onChange={this.handleFormChange}
                        ></StyledInput>
                        <StyledInput
                            name="fullName"
                            placeholder="Full Name"
                            value={this.props.fullName}
                            isValid={this.props.fullName_valid}
                            onChange={this.handleFormChange}
                        ></StyledInput>
                        <StyledInput
                            name="userName"
                            placeholder="Username"
                            value={this.props.userName}
                            isValid={this.props.userName_valid}
                            onChange={this.handleUsernameFormChange}
                        ></StyledInput>
                        <StyledInput
                            name="password"
                            placeholder="Password"
                            type="password"
                            value={this.props.password}
                            isValid={this.props.password_valid}
                            onChange={this.handleFormChange}
                        ></StyledInput>

                        <div className={styles.default.termsDiv}>
                            By signing up, you agree to our Terms, Privacy Policy and Cookies
                            Policy.
                        </div>
                        <StyledButton
                            type="button"
                            disabled={!this.isFormValid()}
                            onClick={this.submitForm}
                            text="Sign Up"
                        />
                    </SignupForm>
                </div>
            </Theme>
        );
    }
}
