import React from "react";
import { styled } from "styled-components";
import { Link } from "react-router-dom";
import LogoSVG from "/public/images/linsta.svg";

const LogoWrapper = styled.div`
  align-content: stretch;
  align-items: stretch;
  border: none;
  display: flex;
  flex-direction: column;
  flex-grow: 0;
  flex-shrink: 0;
  justify-content: flex-start;
  overflow: visible;
  position: relative;
  margin-bottom: 12px;
  margin-top: 36px;
`;

const LargeLogo: React.FC = () => {
    return (
        <LogoWrapper>
            <Link to="/">
                <LogoSVG />
            </Link>
        </LogoWrapper> 
    );
}

export default LargeLogo;