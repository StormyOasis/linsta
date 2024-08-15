import React from "react";
import { styled } from "styled-components";
import { Link } from "react-router-dom";

import LogoSVG from '/public/images/linsta_small.svg';
import SearchSVG from '/public/images/search.svg';

import * as styles from './Header.module.css';

const HeaderWrapper = styled.div`
  z-index: 100;
  align-items: center;
  flex-direction: column;
  display:flex;
  height: 60px;  
  width: 100%;
  padding: 0;
  margin: 0;
  position: relative;
  top: 0;  
`;

const LogoWrapper = styled.div`
  flex-basis: 128px;
  flex-grow: 1;
`;

const LogoImage = styled(LogoSVG)`
   display:flex;
   overflow: visible;
   background: transparent;
`;

const SearchImage = styled(SearchSVG)`
  overflow: hidden;
  height: 16px;
  line-height: 18px;
  width: 16px;
  position: relative;
  cursor: pointer;
  color: rgb(142, 142, 142);
  display: block;
`;

const SearchBox = styled.input`
  display:flex;
  padding-top: 3px;
  padding-bottom: 3px;
  padding-left: 16px;
  padding-right: 16px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  height: 36px;
  line-height: 18px;
  text-align: start;
  width: 350px;
  cursor: pointer;
  background-color: ${props => props.theme["input"].backgroundColor};
`;

const SearchWrapper = styled.div`
  align-content: stretch;
  align-items: stretch;
  border-radius: 100px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 36px;
  min-width: 125px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
`;

const SearchSpan = styled.span`
  color: rgb(115,115,115);
  cursor: pointer;
  font-size: 16px;
  line-height: 20px;
  margin: 0;
  text-wrap: wrap;
  position: relative;

  &:before {
    content: "Search"
  }
`;

const ActionWrapper = styled.div`
  align-items: center;
  align-content: center;
  display: flex;
  flex-direction: row;
  flex-basis: 128px;
  justify-content: flex-end;
  position: relative;
  flex-grow: 1;
`;

const ActionLinkWrapper = styled.div`
  align-content: stretch;
  align-items: stretch;
  display: flex;
  flex-direction: column;
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
          <div style={{flexBasis: "60px"}}></div>
          <div className={styles.fixedHeader}>
            <div className={styles.innerHeader}>
              <LogoWrapper>
                <Link to="/">
                  <LogoImage />
                </Link>
              </LogoWrapper>
              <SearchWrapper>         
                <SearchBox aria-label="Search input box" type="text" placeholder="" >
                </SearchBox>
                <div className={styles.searchBoxDiv1}>
                  <div className={styles.searchBoxDiv2}>
                    <div className={styles.searchBoxDiv3}>
                      <SearchImage />
                    </div>
                    <SearchSpan />                      
                  </div>                  
                </div>
              </SearchWrapper>
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