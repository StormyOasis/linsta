import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

export type StyledLinkProps = {
  to?: string;
  children?: any;
  onClick?: any;
  styleOverride?:any;
};

const StyledLinkWrapper = styled(Link)`
  color: ${props => props.theme['colors'].buttonDefaultColor};
  text-decoration: none;
  display: contents;
  font-weight: 600;
`;

const StyledLink: React.FC<StyledLinkProps> = (props: StyledLinkProps) => {
  const onClick = props.onClick ? props.onClick : () => true;
  const to = props.to ? props.to : "";

  return (
    <StyledLinkWrapper to={to} onClick={onClick} className={props.styleOverride}>
        {props.children}
    </StyledLinkWrapper>
  );
};

export default StyledLink;