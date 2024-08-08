import React from "react";
import { styled } from "styled-components";

import * as styles1 from "./LoginLayout.module.css";
import * as styles2 from "/src/Components/Common/Common.module.css";
const styles = { ...styles1, ...styles2 };

import Theme from "/src/Components/Themes/Theme";
import StyledLink from "/src/Components/Common/StyledLink";
import LargeLogo from "/src/Components/Common/LargeLogo";
import StyledInput from "/src/Components/Common/StyledInput";
import StyledButton from "/src/Components/Common/StyledButton";
import LoginWithFB from "/src/Components/Common/LoginWithFB";
import { login } from "/src/api/Auth";
import { validatePassword } from "/src/utils/utils";
import { LOG_IN_USER_ACTION, LOG_OUT_USER_ACTION } from "/src/Components/state/actions/types";
import { connect } from "react-redux";
import { Store } from "/src/Components/state/store";
import { logout } from "/src/api/Auth";
import { Navigate } from "react-router-dom";

type LoginLayoutProps = {};

type LoginState = {
    userName: string;
    password: string;
    invalidUser: boolean;
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
            invalidUser: false,
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
            this.setState({invalidUser: true});
            return false;
        }

        try {
            logout();
            this.props.logoutUser();            

            const result = await login(this.state.userName, this.state.password);
            if(!result) {
                this.setState({invalidUser: true});
            } else {
                //we should be logged in and the JWT token set into localstorage
                //navigate to root route
                this.props.loginUser();
            }    
        } catch(err) {
            this.setState({invalidUser: true});
        }

        return false;
    }

    renderLoginForm = () => {
        const stylesToAddToLastInput = {marginTop: "8px"};
        const widthStyle = {width: "100%"};

        return (
            <Theme>
                {this.props.isLoggedIn && <Navigate to="/" replace={true} />}
                <LargeLogo />
                <LoginForm method="post">
                    <div className={styles.signupFormDiv1}>
                        <span className={styles.signupIntroSpan}>
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
                    {this.state.invalidUser && <StatusText>Invalid username or password</StatusText>}
                    <StyledButton
                        style={stylesToAddToLastInput}
                        type="button"
                        disabled={!this.isFormValid()}
                        onClick={this.submitForm}
                        text="Login">
                    </StyledButton>
                    <div className={styles.signupFormFbLoginDiv} style={widthStyle}>
                        <LoginWithFB top={true} onClick={this.loginWithFacebookClicked}>Log in with Facebook</LoginWithFB>
                    </div> 
                    <div>
                        <StyledLink to="/forgot" styleOverride={styles.forgotWrapper}>Forgot Password?</StyledLink>
                    </div>
                </LoginForm>
            </Theme>
        );
    }

    override render() {
        return (
            <Theme>
                <LoginLayoutWrapper role="main">
                    <div className={styles.innerDiv1}>
                        <div className={styles.innerDiv2}>
                            <div className={styles.signupBox}>
                                {this.renderLoginForm()}
                            </div>
                            <div
                                className={styles.signupBox}
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