import styled from 'styled-components';
import * as styles1 from "/src/Components/Layout/Login/LoginLayout.module.css";
import * as styles2 from "/src/Components/Common/Common.module.css";
import * as styles3 from "/src/Components/Layout/Signup/SignupLayout.module.css";
import * as styles4 from "/src/Components/Layout/Header.module.css";
import * as styles5 from "/src/../public/defaults.css";

export default {
   ...styles1, 
   ...styles2,
   ...styles3,
   ...styles4,
   ...styles5
}

export const Flex = styled.div.attrs<{ 
    $paddingLeft?: string, $paddingRight?: string, 
    $paddingTop?: string, $paddingBottom?: string,
    $marginLeft?: string, $marginRight?: string, 
    $marginTop?: string, $marginBottom?: string}>(props => ({
        $paddingLeft: props.$paddingLeft || "0",
        $paddingRight: props.$paddingRight || "0",
        $paddingTop: props.$paddingTop || "0",
        $paddingBottom: props.$paddingBottom || "0",
        $marginLeft: props.$marginLeft || "0",
        $marginRight: props.$marginRight || "0",
        $marginTop: props.$marginTop || "0",
        $marginBottom: props.$marginBottom || "0"
    }))`
    
    display: flex;

    margin-left: ${(props) => props.$marginLeft};
    margin-right: ${(props) => props.$marginRight};
    margin-top: ${(props) => props.$marginTop};
    margin-bottom: ${(props) => props.$marginBottom};
    padding-left: ${(props) => props.$paddingLeft};
    padding-right: ${(props) => props.$paddingRight};
    padding-top: ${(props) => props.$paddingTop};
    padding-bottom: ${(props) => props.$paddingBottom};     
`;

export const FlexRow = styled(Flex)`
    flex-direction: row;
`;

export const FlexRowFullWidth = styled(FlexRow)`
    width: 100%;
`;

export const FlexColumn = styled(Flex)`
    flex-direction: column;
`;

export const FlexColumnFullWidth = styled(FlexColumn)`
    width: 100%;
`;

export const Link = styled.a`
    color: ${props => props.theme['colors'].defaultLinkColor};
    text-decoration: none;
`;

export const BoldLink = styled(Link)`
    font-weight: 600;
`;

export const CursorPointerDiv = styled.div`
    cursor: pointer;
`;

export const CursorPointerSpan = styled.span`
    cursor: pointer;
`;

export const DivWithMarginPadding = styled.div.attrs<{ 
    $paddingLeft?: string, $paddingRight?: string, 
    $paddingTop?: string, $paddingBottom?: string,
    $marginLeft?: string, $marginRight?: string, 
    $marginTop?: string, $marginBottom?: string}>(props => ({
        $paddingLeft: props.$paddingLeft || "0",
        $paddingRight: props.$paddingRight || "0",
        $paddingTop: props.$paddingTop || "0",
        $paddingBottom: props.$paddingBottom || "0",
        $marginLeft: props.$marginLeft || "0",
        $marginRight: props.$marginRight || "0",
        $marginTop: props.$marginTop || "0",
        $marginBottom: props.$marginBottom || "0"
    }))`

    margin-left: ${(props) => props.$marginLeft};
    margin-right: ${(props) => props.$marginRight};
    margin-top: ${(props) => props.$marginTop};
    margin-bottom: ${(props) => props.$marginBottom};
    padding-left: ${(props) => props.$paddingLeft};
    padding-right: ${(props) => props.$paddingRight};
    padding-top: ${(props) => props.$paddingTop};
    padding-bottom: ${(props) => props.$paddingBottom};    
`;

export const SpanWithMarginPadding = styled.span.attrs<{ 
    $paddingLeft?: string, $paddingRight?: string, 
    $paddingTop?: string, $paddingBottom?: string,
    $marginLeft?: string, $marginRight?: string, 
    $marginTop?: string, $marginBottom?: string}>(props => ({
        $paddingLeft: props.$paddingLeft || "0",
        $paddingRight: props.$paddingRight || "0",
        $paddingTop: props.$paddingTop || "0",
        $paddingBottom: props.$paddingBottom || "0",
        $marginLeft: props.$marginLeft || "0",
        $marginRight: props.$marginRight || "0",
        $marginTop: props.$marginTop || "0",
        $marginBottom: props.$marginBottom || "0"
    }))`

    margin-left: ${(props) => props.$marginLeft};
    margin-right: ${(props) => props.$marginRight};
    margin-top: ${(props) => props.$marginTop};
    margin-bottom: ${(props) => props.$marginBottom};
    padding-left: ${(props) => props.$paddingLeft};
    padding-right: ${(props) => props.$paddingRight};
    padding-top: ${(props) => props.$paddingTop};
    padding-bottom: ${(props) => props.$paddingBottom};    
`;