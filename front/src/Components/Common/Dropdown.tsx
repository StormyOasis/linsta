import React, { SyntheticEvent, useState } from "react";
import { styled } from "styled-components";

import { Div, FlexColumn, FlexRow } from "./CombinedStyling";
import { DownSVG, UpSVG } from "./Icon";

const Container = styled(FlexColumn)`
    margin-top: 10px;
    height: fit-content;
    pointer-events: all;
`;

const MainContainer = styled(FlexRow)`
    height: 30px;
    align-items: center;
    cursor: pointer;        
`;

const Title = styled(Div) <{ $isOpen: boolean }>`
    font-weight: ${props => props.$isOpen ? "700" : "400"};
    font-size: 1.05em;
    width: 100%
`;

const ArrowContainer = styled(Div)`
    height: 24px;
    width: 24px;
    position: relative;
    align-self: center;
`;

const ContentContainer = styled(Div) <{ $isOpen: boolean }>`
    display: ${props => props.$isOpen ? "flex" : "none"};
`;

type DropdownProps = {
    title: string;
    children?: React.ReactNode;
};

const Dropdown: React.FC<DropdownProps> = (props: DropdownProps) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const handleContainerClick = (event: SyntheticEvent) => {
        event.preventDefault();

        setIsOpen(!isOpen);
    }

    return (
        <Container>
            <MainContainer onClick={handleContainerClick} aria-expanded={isOpen}>
                <Title $isOpen={isOpen}>
                    {props.title}
                </Title>
                <ArrowContainer>
                    {isOpen ? <UpSVG width="24px" height="24px" /> : <DownSVG width="24px" height="24px" />}
                </ArrowContainer>
            </MainContainer>
            <ContentContainer $isOpen={isOpen}>
                {props.children}
            </ContentContainer>
        </Container>
    );
}

export default Dropdown;