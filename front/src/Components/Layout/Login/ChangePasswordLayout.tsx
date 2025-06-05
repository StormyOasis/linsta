import React, { useState } from "react";
import { styled } from "styled-components";
import { Navigate, useSearchParams } from 'react-router-dom';
import * as styles from "../../Common/CombinedStyling";
import Theme from "../../../Components/Themes/Theme";
import StyledInput from "../../../Components/Common/StyledInput";
import { validatePassword } from "../../../utils/utils";
import StyledButton from "../../../Components/Common/StyledButton";
import { postChangePassword } from "../../../api/ServiceController";
import { getCurrentUser } from "../../../api/Auth";

type ChangeProps = {

};

const ChangeLayoutWrapper = styled.main<any>`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const ChangeHeaderImage = styled.span`
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

const ChangeForm = styled.form`
  display: flex;
  flex-direction: column;
  margin: 0;
  max-width: 350px;
  vertical-align: baseline;
`;

const isFormValid = (password1: string, password2: string, token?: string|null, currentPassword?: string) => {
    if(password1 != password2) {
        return false;
    }
    
    if(!validatePassword(password1)) {
        return false;
    }

    if(token == null && currentPassword?.length === 0) {        
        return false;
    }

    return true;
}

const onSubmit = async (setIsFinished:any, password1: string, password2: string, token?: string|null, currentPassword?: string) => {
    try {
        const result = await postChangePassword({userName: getCurrentUser()?.userName, oldPassword: currentPassword, token, password1, password2});
        
        if(result.status == 200 && result.data.status === "OK") {
            setIsFinished(true);
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

const renderChangeForm = () => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [password1, setPassword1] = useState("");
    const [password2, setPassword2] = useState("");
    const [isFinished, setIsFinished] = useState(false);

    const [searchParams, _setSearchParams] = useSearchParams();

    const token = searchParams.get('token');
    return (
        <>
            {isFinished && <Navigate to="/" replace={true} />}
            <ChangeHeaderImage/>
            <ChangeForm method="post">
                <HeadingText>Reset Password</HeadingText>
                <SubHeadingText>
                    Your password must be between 8 and 15 characters and should include both upper and lower case letters, numbers, and special characters.
                </SubHeadingText>
                {token == null &&                  
                    <StyledInput datatestid='currentPassword'
                        name="currentPassword"
                        placeholder="Current Password"
                        value={currentPassword}
                        type="password"
                        isValid={validatePassword(currentPassword)}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(event.target.value)} />
                }
                <StyledInput
                    name="password1"
                    placeholder="New Password"
                    value={password1}
                    type="password"
                    isValid={validatePassword(password1)}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword1(event.target.value)} />       
                <StyledInput
                    name="password2"
                    placeholder="Retype Password"
                    type="password"
                    value={password2}
                    isValid={validatePassword(password2)}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword2(event.target.value)} />                         
                <StyledButton
                    type="button"
                    disabled={!isFormValid(password1, password2, token, currentPassword)}
                    onClick={() => {return onSubmit(setIsFinished, password1, password2, token, currentPassword);}}
                    text="Change Password">
                </StyledButton>

            </ChangeForm>        
        </>
    );
}

const ChangePasswordLayout: React.FC<ChangeProps> = (_props: ChangeProps) => {
    return (
        <Theme>
            <ChangeLayoutWrapper role="main">
                <div className={styles.default.innerDiv1}>
                    <div className={styles.default.innerDiv2}>
                        <div className={styles.default.signupBox}>
                            {renderChangeForm()}
                        </div>
                    </div>
                </div>
            </ChangeLayoutWrapper>
        </Theme>
    );
}

export default ChangePasswordLayout;