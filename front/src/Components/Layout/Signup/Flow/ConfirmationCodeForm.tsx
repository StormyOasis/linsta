import React from "react";
import { styled } from "styled-components";

import SignupInput from "../Common/SignupInput";
import SignupButton from "../Common/SignupButton";

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
    emailOrPhone: string,
    confirmationCode: string,
    confirmationCode_valid: boolean,
    handleFormChange: any,
    changePage: any,
}

export default class ConfirmationCodeForm extends React.Component<ConfirmationCodeFormProps> {

    resendCode = () => {

    }


    handleFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.props.handleFormChange(
            event.target.name,
            event.target.value,
            event.target.value.length > 0
        );
    };    

    override render() {
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
                            Enter the confirmation code we sent to {this.props.emailOrPhone}.
                            <ResendButton onClick={this.resendCode}>Resend Code</ResendButton>
                        </Text>
                    </ConfirmationInnerWrapper>
                </ConfirmationWrapper>
                <ConfirmationWrapper>
                    <ConfirmationInnerWrapper style={{ alignItems: "center", margin: "8px 0", padding: "0 40px" }}>
                        <ConfirmationWrapper style={{ margin: 0, padding: 0 }}>
                            <SignupInput style={{
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
                            <SignupButton
                                type="button" text="Next" disabled={!this.props.confirmationCode_valid}
                                style={{ margin: 0 }} onClick={() => { this.props.changePage(1) }}>
                            </SignupButton>
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