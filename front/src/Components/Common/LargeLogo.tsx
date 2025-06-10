import React from "react";
import { styled } from "styled-components";
import { FlexColumn } from "./CombinedStyling";
import { LinstaSVG } from "./Icon";

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
  margin-top: 2px;
`;

const LargeLogo: React.FC = () => {
    return (
        <LogoWrapper>
            <LinstaSVG width="196px" height="51px" />
        </LogoWrapper> 
    );
}

export default LargeLogo;