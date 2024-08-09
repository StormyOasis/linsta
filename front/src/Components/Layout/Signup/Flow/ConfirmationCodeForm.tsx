import React from "react";
import { styled } from "styled-components";

import { getAccountsSendVerifyNotification, postAccountsAttempt } from "/src/api/ServiceController";
import StyledInput from "/src/Components/Common/StyledInput";
import StyledButton from "/src/Components/Common/StyledButton";
import { Navigate } from "react-router-dom";

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

type ConfirmationCodeFormState = {
    navigateToHome: boolean;
}

export default class ConfirmationCodeForm extends React.Component<ConfirmationCodeFormProps, ConfirmationCodeFormState> {

    messageSent: boolean = false; //This nonsense is bc React strictmode double calls constructor and lifecycle methods in dev
    
    constructor(props: ConfirmationCodeFormProps) {
        super(props);

        this.state = {
            navigateToHome: false,
        };
    }

    override componentDidMount(): void { 
        if(!this.messageSent) {
            this.resendCode();
            this.messageSent = true;
        }
    }

    resendCode = () => {                
        getAccountsSendVerifyNotification(this.props.emailOrPhone)
            .then((res: any) => res)
            .catch((err: any) => {
                console.error(err);
            });
    }

    handleFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.props.handleFormChange(
            event.target.name,
            event.target.value,
            event.target.value.length > 0
        );
    };    

    submitForm = async () => {
        const result = await postAccountsAttempt({
            dryRun: false,
            userName: this.props.userName,
            fullName: this.props.fullName,
            emailOrPhone: this.props.emailOrPhone,
            password: this.props.password,
            confirmCode: this.props.confirmationCode,
            month: this.props.month,
            day: this.props.day,
            year: this.props.year,
        });

        if(result.status === 200) {
            this.setState({navigateToHome: true});
        }
    }

    override render() {
        return (
            <>
                {this.state.navigateToHome && <Navigate to="/" replace={true} />}
                <ConfirmationWrapper style={{ alignItems: "center" }}>
                    <EmailImage aria-label="Email Confirmation" />
                    <ConfirmationInnerWrapper>
                        <Text style={{ fontWeight: 600, margin: 0 }}>
                            Enter Confirmation Code
                        </Text>
                    </ConfirmationInnerWrapper>
                    <ConfirmationInnerWrapper>
                        <Text style={{ maxWidth: "100%" }}>
                            Enter the confirmation code we sent to {this.props.emailOrPhone}.
                            <ResendButton onClick={this.resendCode}>Resend Code</ResendButton>
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
                                value={this.props.confirmationCode}
                                placeholder="Confirmation Code"
                                onChange={this.handleFormChange} 
                                isValid={this.props.confirmationCode_valid} 
                            />
                        </ConfirmationWrapper>
                        <ConfirmationWrapper style={{ width: "100%", margin: 0, padding: "16px 8px 16px 8px" }}>
                            <StyledButton
                                type="button" text="Next" disabled={!this.props.confirmationCode_valid}
                                style={{ margin: 0 }} onClick={() => { this.submitForm(); }}>
                            </StyledButton>
                        </ConfirmationWrapper>
                        <ConfirmationInnerWrapper style={{ margin: 0 }}>
                            <PrevButton onClick={() => this.props.changePage(-1)}>Go Back</PrevButton>
                        </ConfirmationInnerWrapper>
                    </ConfirmationInnerWrapper>
                </ConfirmationWrapper>
            </>
        );
    }
}