import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

export type LinkButtonProps = {
  theme?: string;
  width?: string;
  height?: string;
  url: string;
  children?: any;
};

const StyledLinkButtonWrapper = styled.div<{ $props?: LinkButtonProps }>`
    width: ${(props) => props.width},
    height: ${(props) => props.height};

    border: none;
`;

const LinkButton: React.FC<LinkButtonProps> = (props: LinkButtonProps) => {

  const backgroundColor = "blue" == props.theme ? "rgb(0, 149, 246)" : "white"

  return (
    <Link to={props.url}>
      <StyledLinkButtonWrapper props={props}>
        {props.children}
      </StyledLinkButtonWrapper>
    </Link>
  );
};

export default LinkButton;