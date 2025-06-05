import React, { useState } from "react";
import styled from "styled-components";
import * as styles from "../../Common/CombinedStyling";

import MultiStepModal from "../../Common/MultiStepModal";
import { Div, Span, FlexColumn } from "../../Common/CombinedStyling";
import StyledInput from "../../Common/StyledInput";
import StyledButton from "../../Common/StyledButton";
import StyledLink from "../../Common/StyledLink";
import { MODAL_TYPES } from "../../Redux/slices/modals.slice";
import { actions, useAppDispatch } from "../../Redux/redux";
import { postForgotPassword } from "../../../api/ServiceController";

const ForgotLayoutWrapper = styled.main<any>`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const ForgotHeaderImage = styled(Span)`
    background-image: url('/public/images/forgot.svg');
    display: block; 
    height: 133px; 
    width: 133px;
`;

const HeadingText = styled(Div)`
    margin-top: 10px;
    text-align:center;
    font-weight: 600;        
`;

const SubHeadingText = styled(Div)`
    color: ${props => props.theme['colors'].inputTextColor};
    text-align: center;
    margin-top:6px;
    margin-bottom: 10px;
`;

const ForgotForm = styled.form`
  display: flex;
  flex-direction: column;
  margin: 0;
  max-width: 350px;
  vertical-align: baseline;
`;

const SignupText = styled(Div)`
    margin-top: 10px;
    margin-bottom: 10px;
    text-align: center;
`;

type ForgotPasswordModalProps = {
    onClose: () => void;
    zIndex: number;
    queryResponseTitle: string;
    queryResponseText: string;
}

type ForgotPasswordModalContentProps = {
    queryResponseTitle: string;
    queryResponseText: string;
}

const ForgotPasswordModalContent: React.FC<ForgotPasswordModalContentProps> = (props: ForgotPasswordModalContentProps) => {
    return (
        <Div data-testid="forgotModal">
            <FlexColumn $maxWidth="350px">
                <Span $fontSize="18px" $fontWeight="500" $paddingBottom="20px" $textAlign="center">{props.queryResponseTitle}</Span>
                <Div $fontWeight="400" $paddingBottom="10px" $textAlign="center">
                    {props.queryResponseText}
                </Div>
            </FlexColumn>        
        </Div>
    );
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = (props: ForgotPasswordModalProps) => {
    const steps = [
        {
            title: "Forgot Password",
            element: <ForgotPasswordModalContent queryResponseTitle={props.queryResponseTitle} queryResponseText={props.queryResponseText} />,
            options: {
                showFooter: false                     
            },
        }
    ];

    return (
        <MultiStepModal zIndex={props.zIndex} steps={steps} onClose={props.onClose} stepNumber={0} showLoadingAnimation={false} />
    );
}

const ForgotPasswordLayout: React.FC = () => {
    const [userData, setUserData] = useState('');    
    const dispatch = useAppDispatch();

    const handleSendLinkClick = async () => {
        let title: string = "Error Sending Link";
        let text: string = "An unexpected error has occurred while sending the login link";
        try {
            const result = await postForgotPassword({user: userData});

            if(result.status === 200) {
                title = result.data.title;
                text = result.data.text;
            }
        } catch(err) {
            console.error(err);
        }
        
        dispatch(actions.modalActions.openModal({ 
            modalName: MODAL_TYPES.FORGOT_PASSWORD_MODAL, 
            data: { queryResponseTitle: title, queryResponseText: text} 
        }));        
    }

    return (
        <>      
            <ForgotLayoutWrapper role="main">
                <Div className={styles.default.innerDiv1}>
                    <Div className={styles.default.innerDiv2}>
                        <Div className={styles.default.signupBox}>
                        <ForgotHeaderImage/>
                        <ForgotForm method="post">
                            <HeadingText>Trouble logging in?</HeadingText>
                            <SubHeadingText>
                                Enter your email, phone, or username and we'll send you a link to get back into your account.
                            </SubHeadingText> 
                            <StyledInput
                                datatestid='userName'
                                placeholder="Email, Phone, or Username"
                                value={userData}
                                isValid={userData.length > 0}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUserData(event.target.value)} />
                            <StyledButton
                                type="button"
                                disabled={userData.length == 0}
                                onClick={handleSendLinkClick}
                                text="Send Login Link">
                            </StyledButton>
                            <Div className={styles.default.signupFormDiv1}>
                                <Div className={styles.default.signupFormDiv2}>
                                    <Div className={styles.default.signupFormDiv3} />
                                    <Div className={styles.default.signupFormDiv4}>OR</Div>
                                    <Div className={styles.default.signupFormDiv3} />
                                </Div>
                            </Div>
                            <SignupText>
                                Don't have an account? <StyledLink to="/signup">Sign up</StyledLink>                    
                            </SignupText>  
                        </ForgotForm>                                
                        </Div>
                    </Div>
                </Div>
            </ForgotLayoutWrapper>            
        </>        
    );
}

export default ForgotPasswordLayout;