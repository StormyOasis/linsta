import React from "react";
import { styled } from "styled-components";
import * as styles1 from "/src/Components/Layout/Login/LoginLayout.module.css";
import * as styles2 from "/src/Components/Common/Common.module.css";
const styles = {...styles1, ...styles2};

import FBIconSVG from "/public/images/facebook.svg";


const LoginWithFBButton = styled.button<{ $props?: any }>`
  border-radius: 8px;
  text-decoration: none;
  align-items: center;
  font-weight: 600;
  justify-content: center;
  text-wrap: nowrap;
  color: ${props => props.theme['colors'].buttonTextColorDefault};
  background-color: ${(props) => props.theme["colors"].buttonDefaultColor};
  cursor: pointer;
  display: flex;
  height: 34px;
  position: relative;
  text-align: center;
  padding-left: 16px;
  padding-right: 16px;
  flex-direction: row;
  border: none;
  margin-bottom: 12px;

  &:hover {
    background-color: ${(props) => props.theme["colors"].buttonOnHoverColor};
  }
`;

export type LoginWithFBProps = {
    children?: any;
    onClick?: any;
    top?: boolean;
}

const renderOrDivs = () => {
    return (
        <>
            <div className={styles.signupFormDiv1}>
                <div className={styles.signupFormDiv2}>
                    <div className={styles.signupFormDiv3} />
                    <div className={styles.signupFormDiv4}>OR</div>
                    <div className={styles.signupFormDiv3} />
                </div>
            </div>        
        </>
    );
}

const LoginWithFB: React.FC<LoginWithFBProps> = (props: LoginWithFBProps) => {
    const secondaryStyle = {marginTop: "-5px"};
    return (
        <div style={secondaryStyle} >
            <div className={styles.signupFormFbLoginDiv}>
                {props.top && renderOrDivs()}
                <LoginWithFBButton onClick={props.onClick}>
                    <span className={styles.signupFormFbIcon}>
                        <FBIconSVG />
                    </span>
                    {props.children}
                </LoginWithFBButton>
                {!props.top && renderOrDivs()}
            </div>
        </div>
    )
}

export default LoginWithFB;