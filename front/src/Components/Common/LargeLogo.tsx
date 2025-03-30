import React from "react";
import { styled } from "styled-components";
import { Link } from "react-router-dom";
import LogoSVG from "/public/images/linsta.svg";
import { FlexColumn } from "./CombinedStyling";

const LogoWrapper = styled(FlexColumn)`
  align-content: stretch;
  align-items: stretch;
  border: none;
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