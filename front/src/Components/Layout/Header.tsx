import React from "react";
import { styled } from "styled-components";
import { Link } from "react-router-dom";

import LogoSVG from '/public/images/linsta_small.svg';

import * as styles from './Header.module.css';
import { Div, FlexColumn, FlexRow } from "../Common/CombinedStyling";

const HeaderWrapper = styled(FlexColumn)`
  z-index: 100;
  align-items: center;
  height: 60px;  
  width: 100%;
  padding: 0;
  margin: 0;
  position: relative;
  top: 0;  
`;

const LogoWrapper = styled(Div)`
  flex-basis: 128px;
  flex-grow: 1;
`;

const LogoImage = styled(LogoSVG)`
   display:flex;
   overflow: visible;
   background: transparent;
`;

const ActionWrapper = styled(FlexRow)`
  align-items: center;
  align-content: center;
  flex-basis: 128px;
  justify-content: flex-end;
  position: relative;
  flex-grow: 1;
`;

const ActionLinkWrapper = styled(FlexColumn)`
  align-content: stretch;
  align-items: stretch;
  justify-content: flex-start;
  position: relative;
  margin-left: 16px;
  font-size: 14px;
`;

const LoginButton = styled(Link)`
    border-radius: 8px; 
    text-decoration: none;
    align-items: center;
    font-weight: 600;
    justify-content: center;
    text-wrap: nowrap;
    color: white; 
    background-color: rgb(0, 150, 245);
    cursor: pointer; 
    display: flex;
    height: 32px; 
    position: relative;
    text-align: center;
    padding-left: 16px; 
    padding-right: 16px; 
    flex-direction: row;

    &:hover {
        background-color: rgb(25, 120, 240);
    }
`;

const SignupButton = styled(Link)`
    border-radius: 8px; 
    text-decoration: none;
    align-items: center;
    font-weight: 600;
    justify-content: center;
    text-wrap: nowrap;
    color: rgb(0, 150, 245); 
    background-color: white;
    cursor: pointer; 
    display: flex;
    height: 32px; 
    position: relative;
    text-align: center;  
    padding-right: 16px; 
    flex-direction: row;

    &:hover {
        color: rgb(0, 50, 100);
    }  
`;

class Header extends React.Component<any, any> {
    override render() {
        return (
            <HeaderWrapper>
                <div style={{ flexBasis: "60px" }}></div>
                <div className={styles.fixedHeader}>
                    <div className={styles.innerHeader}>
                        <LogoWrapper>
                            <Link to="/">
                                <LogoImage />
                            </Link>
                        </LogoWrapper>
                        <ActionWrapper>
                            <div className={styles.actionWrapperInner}>
                                <ActionLinkWrapper>
                                    <LoginButton to="/login">
                                        Log In
                                    </LoginButton>
                                </ActionLinkWrapper>
                                <ActionLinkWrapper>
                                    <SignupButton to="/signup">
                                        Sign Up
                                    </SignupButton>
                                </ActionLinkWrapper>
                            </div>
                        </ActionWrapper>
                    </div>
                </div>
            </HeaderWrapper>
        )
    }
}

export default Header; 