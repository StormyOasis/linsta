import React, { SyntheticEvent, useState } from "react";
import { styled } from "styled-components";

import UpSVG from "/public/images/up-line.svg";
import DownSVG from "/public/images/down-line.svg";

const Container = styled.div`
    margin-top: 10px;
    height: fit-content;
    display: flex;
    flex-direction: column;
    pointer-events: all;
`;

const MainContainer = styled.div`
    height: 30px;
    display: flex;
    flex-direction: row;
    align-items: center;
    cursor: pointer;        
`;

const Title = styled.div<{$isOpen: boolean}>`
    font-weight: ${props => props.$isOpen ? "700" : "400"};
    font-size: 1.05em;
    width: 100%
`;

const ArrowContainer = styled.div`
    height: 24px;
    width: 24px;
    position: relative;
    align-self: center;
`;

const ContentContainer = styled.div<{$isOpen: boolean}>`
    display: ${props => props.$isOpen ? "flex" : "none"};
`;

type DropdownProps = {
    title: string;
    children?: any;
};

const Dropdown: React.FC<DropdownProps> = (props: DropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleContainerClick = (event: SyntheticEvent) => {
        event.preventDefault();

        setIsOpen(!isOpen);
    }

    return (
        <Container>
            <MainContainer onClick={handleContainerClick}>
                <Title $isOpen={isOpen}>
                    {props.title}
                </Title>
                <ArrowContainer>
                    {isOpen ? <UpSVG /> : <DownSVG />}
                </ArrowContainer>
            </MainContainer>
            <ContentContainer $isOpen={isOpen}>
                {props.children}
            </ContentContainer>
        </Container>
    );
}

export default Dropdown;