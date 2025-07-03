import React, { useEffect, useState } from "react";
import { styled } from "styled-components";

import * as styles from '../../../Components/Common/CombinedStyling';

import Theme from "../../../Components/Themes/Theme";
import StyledLink from "../../../Components/Common/StyledLink";
import LargeLogo from "../../../Components/Common/LargeLogo";
import StyledInput from "../../../Components/Common/StyledInput";
import StyledButton from "../../../Components/Common/StyledButton";
import { useDispatch, useSelector } from "react-redux";
import { historyUtils, validatePassword } from "../../../utils/utils";
import { AppDispatch } from "../../../Components/Redux/redux";
import { loginUser } from "../../../Components/Redux/slices/auth.slice";
import { Div, Flex, Span } from "../../../Components/Common/CombinedStyling";

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

const StatusText = styled(Flex)`
    display: flex;
    text-align: center;
    color: rgb(200, 10, 10);
    font-size: .9em;
    justify-content: center;
`;

const LoginLayout: React.FC<LoginLayoutProps> = (_props: LoginLayoutProps) => {
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
        
        return dispatch(loginUser({userName, password})).finally(() => setHasSubmitted(true));
    }

    function renderLoginForm() {
        const stylesToAddToLastInput = {marginTop: "8px"};

        return (
            <Theme>
                <LargeLogo />
                <LoginForm method="post" onSubmit={submitForm}>
                    <Div className={styles.default.signupFormDiv1}>
                        <Span className={styles.default.signupIntroSpan}>
                            Log in to see photos and videos from your friends.
                        </Span>
                    </Div>                    
                    <StyledInput
                        shouldValidate={true}
                        name="userName"
                        placeholder="Username"
                        value={userName}
                        isValid={isUserNameValid()}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUserName(event.target.value)}
                    ></StyledInput>
                    <StyledInput
                        shouldValidate={true}
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
                    <Div>
                        <StyledLink to="/forgot" className={styles.default.forgotWrapper}>Forgot Password?</StyledLink>
                    </Div>
                </LoginForm>
            </Theme>
        );
    }
    
    return (
        <Theme>
            <LoginLayoutWrapper role="main">
                <Div className={styles.default.innerDiv1}>
                    <Div className={styles.default.innerDiv2}>
                        <Div className={styles.default.signupBox}>
                            {renderLoginForm()}
                        </Div>
                        <Div
                            className={styles.default.signupBox}
                            style={{ padding: "20px 0" }}>
                            Don't have an account? <StyledLink to="/signup">Sign up</StyledLink>
                        </Div>
                    </Div>
                </Div>
                <Div $margin="auto">
                    <StyledLink to="/about" styleOverride={{fontSize: ".925em", fontWeight: 600}}>                            
                        About
                    </StyledLink>                     
                </Div>
            </LoginLayoutWrapper>
        </Theme>
    );
}

export default LoginLayout;