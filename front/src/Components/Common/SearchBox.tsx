import React from "react";
import styled from "styled-components";
import { Flex} from "../Common/CombinedStyling";
import { CircleXSVG, SearchBoxSVG } from "./Icon";


const SearchContainer = styled(Flex)`
    align-items: center;
    background-color: ${props => props.theme["colors"].buttonDefaultSecondaryColor};
    border: 1px solid ${props => props.theme["colors"].borderDefaultColor};
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    width: 100%;
`;

const Input = styled.input`
    border: none;
    outline: none;
    font-size: 1rem;
    width: 100%;
    background-color: ${props => props.theme["colors"].buttonDefaultSecondaryColor};
`;

const IconWrapper = styled(Flex)`
    align-items: center;
    margin-right: 0.5rem;
`;

const ClearButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-left: 0.5rem;
    font-size: 1rem;
    color: ${props => props.theme["colors"].borderDarkColor};

    &:hover {
        color: ${props => props.theme["colors"].borderDefaultColor};
    }
`;

type SearchBoxProps = {
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
};

const SearchBox: React.FC<SearchBoxProps> = (props: SearchBoxProps) => {
    return (
        <SearchContainer>
            <IconWrapper>
                <SearchBoxSVG width="16px" height="16px" />
            </IconWrapper>            
            <Input
                type="text"
                placeholder={props.placeholder || "Search..."}
                value={props.value}
                onChange={props.onChange}
            />
            {props.value && (
                <ClearButton onClick={props.onClear} aria-label="Clear search">
                    <CircleXSVG width="16px" height="16px" />
                </ClearButton>
            )}            
        </SearchContainer>
    );
}

export default SearchBox;