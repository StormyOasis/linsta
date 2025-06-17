import React from "react";
import { styled } from "styled-components";
import * as styles from "../../../../Components/Common/CombinedStyling";
import Theme from "../../../../Components/Themes/Theme";
import {postAccountsAttempt, getAccountsCheckUserUnique} from "../../../../api/ServiceController";
import StyledInput from "../../../../Components/Common/StyledInput";
import StyledButton from "../../../../Components/Common/StyledButton";
import LargeLogo from "../../../../Components/Common/LargeLogo";
import { validateEmailPhone, validateFullName, validatePassword } from "../../../../utils/utils";
import { Div, Span } from "../../../../Components/Common/CombinedStyling";

const SignupForm = styled.form`
  display: flex;
  flex-direction: column;
  margin: 0;
  max-width: 350px;
  vertical-align: baseline;
`;

export type SignupMainFormProps = {
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

export default class SignupMainForm extends React.Component<SignupMainFormProps> {
    debounceTimer?: ReturnType<typeof setTimeout>;

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
                result = validateEmailPhone(event.target.value);
                break;
            }
            case "fullName": {
                result = validateFullName(event.target.value);
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

    handleUsernameFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        const name = event.target.name;

        // Always update the value immediately (validity will be updated after debounce)
        this.props.handleFormChange(name, value, false);        

        // Clear any existing debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // If input is empty, immediately mark as invalid and return
        if (value.trim().length === 0) {
            return;
        }

        // Debounce the username validation
        this.debounceTimer = setTimeout(() => {
            this.validateUserName(value)
                .then((isNotUnique) => {
                    // Only update if the value hasn't changed since debounce started
                    if (this.props.userName === value) {
                        this.props.handleFormChange(name, value, !isNotUnique);
                    }
                })
                .catch(() => {
                    if (this.props.userName === value) {
                        this.props.handleFormChange(name, value, false);
                    }
                });
        }, 300);
    }

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
console.log("validate");
        if (!this.isFormValid()) {
            return false;
        }
console.log("postAccountsAttempt");
        const res = await postAccountsAttempt({
            dryRun: true,
            emailOrPhone: this.props.emailOrPhone,
            userName: this.props.userName,
            fullName: this.props.fullName,
            password: this.props.password,
        });
console.log(res);
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
                <Div>
                    <SignupForm method="post">
                        <Div className={styles.default.signupFormDiv1}>
                            <Span className={styles.default.signupIntroSpan}>
                                Sign up to see photos and videos from your friends.
                            </Span>
                        </Div>
                        <StyledInput
                            shouldValidate={true}
                            name="emailOrPhone"
                            placeholder="Phone Number or Email"
                            value={this.props.emailOrPhone}
                            isValid={this.props.emailOrPhone_valid}
                            onChange={this.handleFormChange}
                        ></StyledInput>
                        <StyledInput
                            shouldValidate={true}
                            name="fullName"
                            placeholder="Full Name"
                            value={this.props.fullName}
                            isValid={this.props.fullName_valid}
                            onChange={this.handleFormChange}
                        ></StyledInput>
                        <StyledInput
                            shouldValidate={true}
                            name="userName"
                            placeholder="Username"
                            value={this.props.userName}
                            isValid={this.props.userName_valid}
                            onChange={this.handleUsernameFormChange}
                        ></StyledInput>
                        <StyledInput
                            shouldValidate={true}
                            name="password"
                            placeholder="Password"
                            type="password"
                            value={this.props.password}
                            isValid={this.props.password_valid}
                            onChange={this.handleFormChange}
                        ></StyledInput>

                        <Div className={styles.default.termsDiv}>
                            By signing up, you agree to our Terms, Privacy Policy and Cookies
                            Policy.
                        </Div>
                        <StyledButton
                            datatestid="submit-signupmain"
                            type="button"
                            disabled={!this.isFormValid()}
                            onClick={this.submitForm}
                            text="Sign Up"
                        />
                    </SignupForm>
                </Div>
            </Theme>
        );
    }
}
