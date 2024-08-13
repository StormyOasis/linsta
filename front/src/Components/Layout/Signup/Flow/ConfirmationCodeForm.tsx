import React, { useEffect, useState } from "react";
import { styled } from "styled-components";

import { getAccountsSendVerifyNotification, postAccountsAttempt } from "../../../../api/ServiceController";
import StyledInput from "../../../../Components/Common/StyledInput";
import StyledButton from "../../../../Components/Common/StyledButton";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, authActions } from "../../../../Components/Redux/redux";

const ConfirmationWrapper = styled.div`
    align-content: stretch;
    align-items: stretch;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow: visible;
    position: relative;
    max-width: 350px;
    padding: 8px 28px;
`;

const EmailImage = styled.span`
    background-image: url('/public/images/email.svg');
    background-repeat: none;
    display: block;
    height: 84px;
    width: 117px;
`;

const ConfirmationInnerWrapper = styled.div`
    align-content: stretch;
    align-items: stretch;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    flex-grow: 0;
    flex-shrink: 0;
    margin-bottom: 8px;
    margin-top: 16px;
    position: relative;
    overflow: visible; 
`;

const Text = styled.span`
    display: block;    
    margin: 0;
    overflow: visible;
    overflow-wrap: break-word;
    position: relative;
    text-align: center;
    text-wrap: wrap;
    word-break: break-word;
`;

const ResendButton = styled.button`
    background-color: ${props => props.theme['colors'].backgroundColor};
    color: ${props => props.theme['colors'].buttonDefaultColor};
    cursor: pointer;
    align-items: flex-start;
    position: relative;
    text-align: center;
    font-weight: 600;
    border: none;
    overflow-wrap: break-word;
    overflow: visible;
    text-wrap: wrap;
`;

const PrevButton = styled.button`
    background-color: ${props => props.theme['colors'].backgroundColor};
    color: ${props => props.theme['colors'].buttonDefaultColor};
    cursor: pointer;
    align-items: flex-start
    position: relative;
    text-align: center;
    font-weight: 600;
    border: none;
    font-size: 14px;
    display: block;
    line-height: 18px;
    overflow-wrap: break-word;
    overflow: visible;
    text-wrap: wrap;
`;

type ConfirmationCodeFormProps = {
    userName: string;
    fullName: string;
    emailOrPhone: string;
    password: string;
    confirmationCode: string;
    month: number;
    day: number;
    year: number;
    confirmationCode_valid: boolean,
    handleFormChange: any,
    changePage: any,
}

let emailStep = 0;
const ConfirmationCodeForm: React.FC<ConfirmationCodeFormProps> = (props: ConfirmationCodeFormProps) => {
    const dispatch = useDispatch<AppDispatch>();
    
    useEffect(() => {
        if(emailStep === 1) {
            //automatically send the message the very first time this component is mounted
            //every subsequent resend requires a user click the link 
            //(Note: Using this emailStep variable bc in dev mode React.StrictMode double calls the 
            //useEffect so have to track it outside react. yuk...)
            
           resendCode();
        }
        emailStep++;
    }, [])

    function resendCode() {
        getAccountsSendVerifyNotification(props.emailOrPhone)
            .then((res: any) => res)
            .catch((err: any) => {
                console.error(err);
            });
    }

    function handleFormChange (event: React.ChangeEvent<HTMLInputElement>) {
        props.handleFormChange(
            event.target.name,
            event.target.value,
            event.target.value.length > 0
        );
    };    

    async function submitForm() {
        const result = await postAccountsAttempt({
            dryRun: false,
            userName: props.userName,
            fullName: props.fullName,
            emailOrPhone: props.emailOrPhone,
            password: props.password,
            confirmCode: props.confirmationCode,
            month: props.month,
            day: props.day,
            year: props.year,
        });

        if(result.status === 200) {                             
            const userName = props.userName;
            const password = props.password;

            dispatch(authActions.login({userName, password}))
        }
    }

    return (
        <>
            <ConfirmationWrapper style={{ alignItems: "center" }}>
                <EmailImage aria-label="Email Confirmation" />
                <ConfirmationInnerWrapper>
                    <Text style={{ fontWeight: 600, margin: 0 }}>
                        Enter Confirmation Code
                    </Text>
                </ConfirmationInnerWrapper>
                <ConfirmationInnerWrapper>
                    <Text style={{ maxWidth: "100%" }}>
                        Enter the confirmation code we sent to {props.emailOrPhone}.
                        <ResendButton onClick={resendCode}>Resend Code</ResendButton>
                    </Text>
                </ConfirmationInnerWrapper>
            </ConfirmationWrapper>
            <ConfirmationWrapper>
                <ConfirmationInnerWrapper style={{ alignItems: "center", margin: "8px 0", padding: "0 40px" }}>
                    <ConfirmationWrapper style={{ margin: 0, padding: 0 }}>
                        <StyledInput style={{
                            borderRadius: "6px", cursor: "text", lineHeight: "30px",
                            padding: "0px 12px", textAlign: "left", textTransform: "none", width: "240px"}}
                            maxLength={8}
                            type="text"
                            name="confirmationCode"
                            value={props.confirmationCode}
                            placeholder="Confirmation Code"
                            onChange={handleFormChange} 
                            isValid={props.confirmationCode_valid} 
                        />
                    </ConfirmationWrapper>
                    <ConfirmationWrapper style={{ width: "100%", margin: 0, padding: "16px 8px 16px 8px" }}>
                        <StyledButton
                            type="button" text="Next" disabled={!props.confirmationCode_valid}
                            style={{ margin: 0 }} onClick={() => { submitForm(); }}>
                        </StyledButton>
                    </ConfirmationWrapper>
                    <ConfirmationInnerWrapper style={{ margin: 0 }}>
                        <PrevButton onClick={() => props.changePage(-1)}>Go Back</PrevButton>
                    </ConfirmationInnerWrapper>
                </ConfirmationInnerWrapper>
            </ConfirmationWrapper>
        </>
    );
}

export default ConfirmationCodeForm;