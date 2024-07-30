import React from "react";
import { styled } from "styled-components";
import { Link } from "react-router-dom";

import FBIconSVG from "/public/images/facebook.svg";
import LogoSVG from "/public/images/linsta.svg";

import * as styles from "../SignupLayout.module.css";
import Theme from "../../../../Components/Themes/Theme";
import SignupInput from "../Common/SignupInput";
import SignupButton from "../Common/SignupButton";
import {postAccountsAttempt, getAccountsCheckUserUnique} from "../../../../api/ServiceController";

const LogoWrapper = styled.div`
  align-content: stretch;
  align-items: stretch;
  border: none;
  display: flex;
  flex-direction: column;
  flex-grow: 0;
  flex-shrink: 0;
  justify-content: flex-start;
  overflow: visible;
  position: relative;
  margin-bottom: 12px;
  margin-top: 36px;
`;

const LoginWithFBButton = styled.button<{ $props?: any }>`
  border-radius: 8px;
  text-decoration: none;
  align-items: center;
  font-weight: 600;
  justify-content: center;
  text-wrap: nowrap;
  color: ${props => props.theme['colors'].buttonTextColorDefault};
  background-color: ${(props) => props.theme["colors"].buttonDefaultColor};
  cursor: pointer;
  display: flex;
  height: 34px;
  position: relative;
  text-align: center;
  padding-left: 16px;
  padding-right: 16px;
  flex-direction: row;
  border: none;
  margin-bottom: 12px;

  &:hover {
    background-color: ${(props) => props.theme["colors"].buttonOnHoverColor};
  }
`;

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

    validatePassword = (value: string): boolean => {
        const regex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&^])[A-Za-z\d@.#$!%*?&]{8,15}$/;

        return regex.test(value);
    };

    validateUserName = async (value: string): Promise<boolean> => {
        if (value == null || value.length == 0) return false;

        const response = await getAccountsCheckUserUnique(value);

        return response.data;
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
                result = this.validatePassword(event.target.value);
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
                <LogoWrapper>
                    <Link to="/">
                        <LogoSVG />
                    </Link>
                </LogoWrapper>
                <div>
                    <SignupForm method="post">
                        <div className={styles.signupFormDiv1}>
                            <span className={styles.signupIntroSpan}>
                                Sign up to see photos and videos from your friends.
                            </span>
                        </div>
                        <div className={styles.signupFormFbLoginDiv}>
                            <LoginWithFBButton onClick={this.loginWithFacebookClicked}>
                                <span className={styles.signupFormFbIcon}>
                                    <FBIconSVG />
                                </span>
                                Log in with Facebook
                            </LoginWithFBButton>
                            <div className={styles.signupFormDiv1}>
                                <div className={styles.signupFormDiv2}>
                                    <div className={styles.signupFormDiv3} />
                                    <div className={styles.signupFormDiv4}>OR</div>
                                    <div className={styles.signupFormDiv3} />
                                </div>
                            </div>
                        </div>
                        <SignupInput
                            name="emailOrPhone"
                            placeholder="Phone Number or Email"
                            value={this.props.emailOrPhone}
                            isValid={this.props.emailOrPhone_valid}
                            onChange={this.handleFormChange}
                        ></SignupInput>
                        <SignupInput
                            name="fullName"
                            placeholder="Full Name"
                            value={this.props.fullName}
                            isValid={this.props.fullName_valid}
                            onChange={this.handleFormChange}
                        ></SignupInput>
                        <SignupInput
                            name="userName"
                            placeholder="Username"
                            value={this.props.userName}
                            isValid={this.props.userName_valid}
                            onChange={this.handleUsernameFormChange}
                        ></SignupInput>
                        <SignupInput
                            name="password"
                            placeholder="Password"
                            type="password"
                            value={this.props.password}
                            isValid={this.props.password_valid}
                            onChange={this.handleFormChange}
                        ></SignupInput>

                        <div className={styles.termsDiv}>
                            By signing up, you agree to our Terms, Privacy Policy and Cookies
                            Policy.
                        </div>
                        <SignupButton
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
