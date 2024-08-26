import React, { useEffect, useState } from "react";
import { styled } from "styled-components";

import * as styles from '../../../Components/Common/CombinedStyling';

import Theme from "../../../Components/Themes/Theme";
import StyledLink from "../../../Components/Common/StyledLink";
import LargeLogo from "../../../Components/Common/LargeLogo";
import StyledInput from "../../../Components/Common/StyledInput";
import StyledButton from "../../../Components/Common/StyledButton";
import LoginWithFB from "../../../Components/Common/LoginWithFB";
import { useDispatch, useSelector } from "react-redux";
import { historyUtils, validatePassword } from "../../../utils/utils";
import { AppDispatch, actions } from "../../../Components/Redux/redux";

type LoginLayoutProps = {
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

const LoginLayout: React.FC<LoginLayoutProps> = (props: LoginLayoutProps) => {
    const dispatch = useDispatch<AppDispatch>();
    const authUser = useSelector((value:any) => value?.auth?.user);
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [hasSubmitted, setHasSubmitted] = useState(false);

    useEffect(() => {
        if(authUser) {
            historyUtils.navigate("/");
        }
    }, []);

 
    function loginWithFacebookClicked(event: React.MouseEventHandler<HTMLButtonElement>) {
        window.alert("todo");
    };

    function isUserNameValid(): boolean {
        return userName.trim().length > 0;
    }

    function isFormValid(): boolean {
        return isUserNameValid() && validatePassword(password);
    }

    function submitForm(event: any) {
        event?.preventDefault();

        if(!isFormValid()) {
            return;
        }
        
        return dispatch(actions.authActions.login({userName, password})).finally(() => setHasSubmitted(true));
    }

    function renderLoginForm() {
        const stylesToAddToLastInput = {marginTop: "8px"};
        const widthStyle = {width: "100%"};

        return (
            <Theme>
                <LargeLogo />
                <LoginForm method="post" onSubmit={submitForm}>
                    <div className={styles.default.signupFormDiv1}>
                        <span className={styles.default.signupIntroSpan}>
                            Log in to see photos and videos from your friends.
                        </span>
                    </div>                    
                    <StyledInput
                        name="userName"
                        placeholder="Username"
                        value={userName}
                        isValid={isUserNameValid()}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUserName(event.target.value)}
                    ></StyledInput>
                    <StyledInput
                        name="password"
                        placeholder="Password"
                        type="password"
                        value={password}
                        isValid={validatePassword(password)}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                    ></StyledInput>
                    {hasSubmitted && <StatusText>Invalid username or password</StatusText>}
                    <StyledButton
                        style={stylesToAddToLastInput}
                        type="submit"
                        disabled={!isFormValid()}                        
                        text="Login">
                    </StyledButton>
                    <div className={styles.default.signupFormFbLoginDiv} style={widthStyle}>
                        <LoginWithFB top={true} onClick={loginWithFacebookClicked}>Log in with Facebook</LoginWithFB>
                    </div> 
                    <div>
                        <StyledLink to="/forgot" className={styles.default.forgotWrapper}>Forgot Password?</StyledLink>
                    </div>
                </LoginForm>
            </Theme>
        );
    }
    
    return (
        <Theme>
            <LoginLayoutWrapper role="main">
                <div className={styles.default.innerDiv1}>
                    <div className={styles.default.innerDiv2}>
                        <div className={styles.default.signupBox}>
                            {renderLoginForm()}
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

export default LoginLayout;