import React from "react";
import { styled } from "styled-components";
import { connect } from "react-redux";
import { Navigate } from "react-router-dom";

import * as styles from '../../../Components/Common/CombinedStyling';

import Theme from "../../../Components/Themes/Theme";
import StyledLink from "../../../Components/Common/StyledLink";
import LargeLogo from "../../../Components/Common/LargeLogo";
import StyledInput from "../../../Components/Common/StyledInput";
import StyledButton from "../../../Components/Common/StyledButton";
import LoginWithFB from "../../../Components/Common/LoginWithFB";
import { login, logout } from "../../../api/Auth";
import { validatePassword } from "../../../utils/utils";
import { LOG_IN_USER_ACTION, LOG_OUT_USER_ACTION } from "../../../Components/state/actions/types";

import { Store } from "../../../Components/state/store";


type LoginLayoutProps = {
    isLoggedIn?: boolean,
};

type LoginState = {
    userName: string;
    password: string;
    loginStep: number;
};

const LoginLayoutWrapper = styled.main<any>`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  margin: 0;
  max-width: 350px;
  vertical-align: baseline;
`;

const StatusText = styled.div`
    display: flex;
    text-align: center;
    color: rgb(200, 10, 10);
    font-size: .9em;
    justify-content: center;
`;

class LoginLayout extends React.Component<LoginLayoutProps, LoginState> {

    constructor(props: LoginLayoutProps) {
        super(props);

        this.state = {
            userName: "",
            password: "",
            loginStep: 0
        };
    }

    loginWithFacebookClicked = (event: React.MouseEventHandler<HTMLButtonElement>) => {
        window.alert("todo");
    };

    isUserNameValid = (): boolean => {
        return this.state.userName.trim().length > 0;
    }

    isFormValid = (): boolean => {
        return this.isUserNameValid() && validatePassword(this.state.password);
    }

    submitForm = async (event: React.ChangeEvent<HTMLButtonElement>) => {
        event?.preventDefault();

        if(!this.isFormValid()) {
            this.setState({loginStep: 0});
            return false;
        }

        try {
            logout();    

            const result = await login(this.state.userName, this.state.password);
            if(!result) {
                this.setState({loginStep: 1});
            } else {
                //we should be logged in and the JWT token set into localstorage
                //navigate to root route
                this.setState({loginStep: 2})
            }    
        } catch(err) {
            this.setState({loginStep: 1});
        }

        return false;
    }

    renderLoginForm = () => {
        const stylesToAddToLastInput = {marginTop: "8px"};
        const widthStyle = {width: "100%"};

        return (
            <Theme>
                {this.state.loginStep === 2 && <Navigate to="/" replace={true} />}
                <LargeLogo />
                <LoginForm method="post">
                    <div className={styles.default.signupFormDiv1}>
                        <span className={styles.default.signupIntroSpan}>
                            Log in to see photos and videos from your friends.
                        </span>
                    </div>                    
                    <StyledInput
                        name="userName"
                        placeholder="Username"
                        value={this.state.userName}
                        isValid={this.isUserNameValid()}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => this.setState({ userName: event.target.value })}
                    ></StyledInput>
                    <StyledInput
                        name="password"
                        placeholder="Password"
                        type="password"
                        value={this.state.password}
                        isValid={validatePassword(this.state.password)}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => this.setState({ password: event.target.value })}
                    ></StyledInput>
                    {this.state.loginStep === 1 && <StatusText>Invalid username or password</StatusText>}
                    <StyledButton
                        style={stylesToAddToLastInput}
                        type="button"
                        disabled={!this.isFormValid()}
                        onClick={this.submitForm}
                        text="Login">
                    </StyledButton>
                    <div className={styles.default.signupFormFbLoginDiv} style={widthStyle}>
                        <LoginWithFB top={true} onClick={this.loginWithFacebookClicked}>Log in with Facebook</LoginWithFB>
                    </div> 
                    <div>
                        <StyledLink to="/forgot" styleOverride={styles.default.forgotWrapper}>Forgot Password?</StyledLink>
                    </div>
                </LoginForm>
            </Theme>
        );
    }

    override render() {
        return (
            <Theme>
                <LoginLayoutWrapper role="main">
                    <div className={styles.default.innerDiv1}>
                        <div className={styles.default.innerDiv2}>
                            <div className={styles.default.signupBox}>
                                {this.renderLoginForm()}
                            </div>
                            <div
                                className={styles.default.signupBox}
                                style={{ padding: "20px 0" }}>
                                Don't have an account? <StyledLink to="/signup">Sign up</StyledLink>
                            </div>
                        </div>
                    </div>
                </LoginLayoutWrapper>
            </Theme>
        );
    }
}

const mapStateToProps = (state:Store) => ({
    isLoggedIn: state.isLoggedIn
});

const mapDispatchToProps = (dispatch:any) => ({
    loginUser: () => dispatch({type: LOG_IN_USER_ACTION}),
    logoutUser: () => dispatch({type: LOG_OUT_USER_ACTION}),
});

export default connect(mapStateToProps, mapDispatchToProps)(LoginLayout);