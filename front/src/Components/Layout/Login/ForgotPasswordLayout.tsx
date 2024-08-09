import React, { useState } from "react";
import { styled } from "styled-components";

import * as styles from "/src/Components/Common/CombinedStyling";

import Theme from "/src/Components/Themes/Theme";
import StyledLink from "/src/Components/Common/StyledLink";
import StyledInput from "/src/Components/Common/StyledInput";
import StyledButton from "/src/Components/Common/StyledButton";
import Modal from "/src/Components/Common/Modal";
import { postForgotPassword } from "/src/api/ServiceController";

type ForgotProps = {

};

const ForgotLayoutWrapper = styled.main<any>`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const ForgotHeaderImage = styled.span`
    background-image: url('/public/images/forgot.svg');
    display: block; 
    height: 133px; 
    width: 133px;
`;

const HeadingText = styled.div`
    margin-top: 10px;
    text-align:center;
    font-weight: 600;        
`;

const SubHeadingText = styled.div`
    color: rgb(115,115,155);
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

const SignupText = styled.div`
    margin-top: 10px;
    margin-bottom: 10px;
    text-align: center;
`;

const ModalContentWrapper = styled.div`
    align-content: stretch;
    align-items: center;
    border: none;
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    flex-shrink: 0;
    justify-content: flex-start;
    overflow: visible;
    pointer-events: all;
    position: relative;
    margin: 20px 28px 20px 28px;
`;

const ModalSectionWrapper = styled.div`
    align-content: stretch;
    align-items: stretch;
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    flex-shrink: 0;
    justify-content: flex-start;
    overflow: visible;
    position: relative;
    pointer-events: all;
`;

const renderModal = (showModal, setShowModal, queryResponse) => {
    if(queryResponse == null) {
        throw new Error("Invalid query data");
    }

    const cont = document.getElementById("modalContainer");
    const sectionCont = document.getElementById("mainSectionContainer");
    if (cont && sectionCont) {
        cont.style.height = "100%";
        sectionCont.style.pointerEvents = "none";
    }

    return (
        <>
            <Modal title="Forgot Password" onClose={()=> {
                setShowModal(false);
                if (cont && sectionCont) {
                    cont.style.height = "0%";
                    sectionCont.style.pointerEvents = "auto";
                }                
            }}>
                <ModalContentWrapper>
                    <ModalSectionWrapper style={{ maxWidth: "350px", padding: "4px" }}>
                        <span style={{fontSize: "18px", fontWeight: 500, paddingBottom: "20px", textAlign: "center"}}>{queryResponse.title}</span>
                        <div style={{fontWeight: 400, paddingBottom: "10px", textAlign: "center"}}>
                            {queryResponse.text}
                        </div>
                    </ModalSectionWrapper>        
                </ModalContentWrapper>
            </Modal>
        </>
    );
}

const onSubmit = async (userData: string, setShowModal, setQueryResponse) => {
    try {
        const result = await postForgotPassword({user: userData});

        if(result.status == 200) {
            setQueryResponse({title: result.data.title, text: result.data.text});
            setShowModal(true);
        }
        else {
            throw new Error();
        }

    } catch(err) {
        console.error(err);
        return false;
    }
    return true;
}

const renderForgotForm = () => {
    const [userData, setUserData] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [queryResponse, setQueryResponse] = useState(null);

    return (
        <>
            {showModal && renderModal(showModal, setShowModal, queryResponse)}
            <ForgotHeaderImage/>
            <ForgotForm method="post">
                <HeadingText>Trouble logging in?</HeadingText>
                <SubHeadingText>
                    Enter your email, phone, or username and we'll send you a link to get back into your account.
                </SubHeadingText> 
                <StyledInput
                    name="userName"
                    placeholder="Email, Phone, or Username"
                    value={userData}
                    isValid={userData.length > 0}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUserData(event.target.value)} />
                <StyledButton
                    type="button"
                    disabled={userData.length == 0}
                    onClick={() => {return onSubmit(userData, setShowModal, setQueryResponse);}}
                    text="Send Login Link">
                </StyledButton>
                <div className={styles.default.signupFormDiv1}>
                    <div className={styles.default.signupFormDiv2}>
                        <div className={styles.default.signupFormDiv3} />
                        <div className={styles.default.signupFormDiv4}>OR</div>
                        <div className={styles.default.signupFormDiv3} />
                    </div>
                </div>
                <SignupText>
                    Don't have an account? <StyledLink to="/signup">Sign up</StyledLink>                    
                </SignupText>  
            </ForgotForm>           
        </>
    );
}

const ForgotPasswordLayout: React.FC<ForgotProps> = (props: ForgotProps) => {
    return (
        <Theme>
            <ForgotLayoutWrapper role="main">
                <div className={styles.default.innerDiv1}>
                    <div className={styles.default.innerDiv2}>
                        <div className={styles.default.signupBox}>
                            {renderForgotForm()}
                        </div>
                    </div>
                </div>
            </ForgotLayoutWrapper>
        </Theme>
    );
}

export default ForgotPasswordLayout;