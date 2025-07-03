import styled from 'styled-components';
import * as styles1 from "/src/Components/Layout/Login/LoginLayout.module.css";
import * as styles2 from "/src/Components/Common/Common.module.css";
import * as styles3 from "/src/Components/Layout/Signup/SignupLayout.module.css";
import * as styles4 from "/src/Components/Layout/Header.module.css";

export default {
   ...styles1, 
   ...styles2,
   ...styles3,
   ...styles4
}

export const Div = styled.div.attrs<{ 
    $flexBasis?: string|null, $flexShrink?: string|null, 
    $flexGrow?: string|null, $flexWrap?: string|null,     
    $paddingLeft?: string|null, $paddingRight?: string|null, 
    $paddingTop?: string|null, $paddingBottom?: string|null,
    $marginLeft?: string|null, $marginRight?: string|null, 
    $marginTop?: string|null, $marginBottom?: string|null, $lineHeight?: string|null,
    $position?: string|null, $cursor?: string|null, $display?: string|null, $justifyItems?: string|null,
    $overflow?: string|null, $justifyContent?: string|null, $justifySelf?: string|null, $verticalAlign?: string|null,
    $minWidth?: string|null, $width?: string|null, $maxWidth?:string|null, $textAlign?: string|null,
    $minHeight?: string|null, $height?: string|null, $maxHeight?:string|null, $fontWeight?: string|null,
    $fontSize?: string|null, $alignItems?: string|null, $alignSelf?: string|null, $textWrap?: string|null,
    $alignContent?: string|null, $zIndex?: string|null, $flexDirection?: string|null, $color?: string|null,
    $top?: string|null, $bottom?: string|null, $left?: string|null, $right?: string|null,
    $backgroundImage?: string|null, $padding?: string|null, $margin?: string|null}>
    (props => ({
        $flexBasis: props.$flexBasis || null,
        $flexGrow: props.$flexGrow || null,
        $flexShrink: props.$flexShrink || null,
        $flexWrap: props.$flexWrap || null,
        $flexDirection: props.$flexDirection || null,
        
        $textWrap: props.$textWrap || null,
        $backgroundImage: props.$backgroundImage || null,
        $color: props.$color || null,
        $cursor: props.$cursor || null,
        $display: props.$display || null,
        $fontSize: props.$fontSize || null,
        $fontWeight: props.$fontWeight || null,
        $lineHeight: props.$lineHeight || null,
        $overflow: props.$overflow || null,     
        $position: props.$position || null,
        $textAlign: props.$textAlign || null,
        $verticalAlign: props.$verticalAlign || null,
        $zIndex: props.$zIndex || null,
        
        $alignContent: props.$alignContent || null,
        $alignItems: props.$alignItems || null,
        $alignSelf: props.$alignSelf || null,
        $justifyContent: props.$justifyContent || null,
        $justifySelf: props.$justifySelf || null,
        $justifyItems: props.$justifyItems || null,

        $minWidth: props.$minWidth || null,
        $width: props.$width || null,
        $maxWidth: props.$maxWidth || null,
        $minHeight: props.$minHeight || null,
        $height: props.$height || null,
        $maxHeight: props.$maxHeight || null,

        $padding: props.$padding || null,
        $margin: props.$margin || null,
        $marginLeft: props.$marginLeft || null,
        $marginRight: props.$marginRight || null,
        $marginTop: props.$marginTop || null,
        $marginBottom: props.$marginBottom || null,          
        $paddingLeft: props.$paddingLeft || null,
        $paddingRight: props.$paddingRight || null,
        $paddingTop: props.$paddingTop || null,
        $paddingBottom: props.$paddingBottom || null,

        $left: props.$left || null,
        $right: props.$right || null,
        $top: props.$top || null,
        $bottom: props.$bottom || null,     
    }))`
    
    flex-basis: ${(props) => props.$flexBasis};
    flex-direction: ${(props) => props.$flexDirection};
    flex-grow: ${(props) => props.$flexGrow};
    flex-shrink: ${(props) => props.$flexShrink};
    flex-wrap: ${(props) => props.$flexWrap};

    background-image: ${(props) => props.$backgroundImage};
    color: ${(props) => props.$color};
    cursor: ${(props) => props.$cursor};
    display: ${(props) => props.$display};
    font-size: ${(props) => props.$fontSize};
    font-weight: ${(props) => props.$fontWeight};
    line-height: ${(props) => props.$lineHeight}; 
    overflow: ${(props) => props.$overflow};       
    position: ${(props) => props.$position};
    text-align: ${(props) => props.$textAlign};  
    text-wrap:  ${(props) => props.$textWrap};     
    z-index: ${(props) => props.$zIndex};

    align-content: ${(props) => props.$alignContent};
    align-items: ${(props) => props.$alignItems};
    align-self: ${(props) => props.$alignSelf};
    justify-content: ${(props) => props.$justifyContent};
    justify-self: ${(props) => props.$justifySelf};
    justify-items: ${(props) => props.$justifyItems};
    vertical-align: ${(props) => props.$verticalAlign};

    min-width: ${(props) => props.$minWidth};
    width: ${(props) => props.$width};
    max-width: ${(props) => props.$maxWidth};
    min-height: ${(props) => props.$minHeight};
    height: ${(props) => props.$height};
    max-height: ${(props) => props.$maxHeight};    
    
    margin: ${(props) => props.$margin ? props.$margin + " !important" : null};
    margin-left: ${(props) => props.$marginLeft ? props.$marginLeft + " !important" : null};
    margin-right: ${(props) => props.$marginRight ? props.$marginRight + " !important" : null};
    margin-top: ${(props) => props.$marginTop ? props.$marginTop + " !important" : null};
    margin-bottom: ${(props) => props.$marginBottom ? props.$marginBottom + " !important" : null};
    padding: ${(props) => props.$padding ? props.$padding + " !important" : null};
    padding-left: ${(props) => props.$paddingLeft ? props.$paddingLeft + " !important" : null};
    padding-right: ${(props) => props.$paddingRight ? props.$paddingRight + " !important" : null};
    padding-top: ${(props) => props.$paddingTop ? props.$paddingTop + " !important" : null};
    padding-bottom: ${(props) => props.$paddingBottom ? props.$paddingBottom + " !important" : null};

    left: ${(props) => props.$left};
    right: ${(props) => props.$right};
    top: ${(props) => props.$top};
    bottom: ${(props) => props.$bottom};
`;

export const Span = styled.span.attrs<{ 
    $flexBasis?: string|null, $flexShrink?: string|null, 
    $flexGrow?: string|null, $flexWrap?: string|null,     
    $paddingLeft?: string|null, $paddingRight?: string|null, 
    $paddingTop?: string|null, $paddingBottom?: string|null,
    $marginLeft?: string|null, $marginRight?: string|null, $justifyItems?: string|null,
    $marginTop?: string|null, $marginBottom?: string|null, $color?: string|null,
    $position?: string|null, $cursor?: string|null, $display?: string|null, $lineHeight?: string|null,
    $overflow?: string|null, $justifyContent?: string|null, $justifySelf?: string|null, $verticalAlign?: string|null,
    $minWidth?: string|null, $width?: string|null, $maxWidth?:string|null, $textAlign?: string|null,
    $minHeight?: string|null, $height?: string|null, $maxHeight?:string|null, $fontWeight?: string|null,
    $fontSize?: string|null, $alignItems?: string|null, $alignSelf?: string|null, $backgroundImage?: string|null,
    $alignContent?: string|null, $zIndex?: string|null, $flexDirection?: string|null, $textWrap?: string|null,
    $top?: string|null, $bottom?: string|null, $left?: string|null, $right?: string|null,
    $padding?: string|null, $margin?: string|null}>
    (props => ({
        $flexBasis: props.$flexBasis || null,
        $flexGrow: props.$flexGrow || null,
        $flexShrink: props.$flexShrink || null,
        $flexWrap: props.$flexWrap || null,
        $flexDirection: props.$flexDirection || null,
        
        $backgroundImage: props.$backgroundImage || null,
        $color: props.$color || null,
        $cursor: props.$cursor || null,
        $display: props.$display || null,
        $fontSize: props.$fontSize || null,
        $fontWeight: props.$fontWeight || null,
        $lineHeight: props.$lineHeight || null,
        $overflow: props.$overflow || null,     
        $position: props.$position || null,
        $textAlign: props.$textAlign || null,
        $textWrap: props.$textWrap || null,
        $verticalAlign: props.$verticalAlign || null,
        $zIndex: props.$zIndex || null,
        
        $alignContent: props.$alignContent || null,
        $alignItems: props.$alignItems || null,
        $alignSelf: props.$alignSelf || null,
        $justifyContent: props.$justifyContent || null,
        $justifySelf: props.$justifySelf || null,
        $justifyItems: props.$justifyItems || null,

        $minWidth: props.$minWidth || null,
        $width: props.$width || null,
        $maxWidth: props.$maxWidth || null,
        $minHeight: props.$minHeight || null,
        $height: props.$height || null,
        $maxHeight: props.$maxHeight || null,        

        $padding: props.$padding || null,
        $margin: props.$margin || null,
        $marginLeft: props.$marginLeft || null,
        $marginRight: props.$marginRight || null,
        $marginTop: props.$marginTop || null,
        $marginBottom: props.$marginBottom || null,          
        $paddingLeft: props.$paddingLeft || null,
        $paddingRight: props.$paddingRight || null,
        $paddingTop: props.$paddingTop || null,
        $paddingBottom: props.$paddingBottom || null,

        $left: props.$left || null,
        $right: props.$right || null,
        $top: props.$top || null,
        $bottom: props.$bottom || null,     
    }))`
    
    flex-basis: ${(props) => props.$flexBasis};
    flex-direction: ${(props) => props.$flexDirection};
    flex-grow: ${(props) => props.$flexGrow};
    flex-shrink: ${(props) => props.$flexShrink};
    flex-wrap: ${(props) => props.$flexWrap};

    background-image: ${(props) => props.$backgroundImage};
    position: ${(props) => props.$position};
    color: ${(props) => props.$color};
    cursor: ${(props) => props.$cursor};
    display: ${(props) => props.$display};
    font-size: ${(props) => props.$fontSize};
    font-weight: ${(props) => props.$fontWeight};
    line-height: ${(props) => props.$lineHeight}; 
    overflow: ${(props) => props.$overflow};   
    text-align: ${(props) => props.$textAlign};  
    text-wrap:  ${(props) => props.$textWrap};     
    z-index: ${(props) => props.$zIndex};

    align-content: ${(props) => props.$alignContent};
    align-items: ${(props) => props.$alignItems};
    align-self: ${(props) => props.$alignSelf};
    justify-content: ${(props) => props.$justifyContent};
    justify-self: ${(props) => props.$justifySelf};
    justify-items: ${(props) => props.$justifyItems};
    vertical-align: ${(props) => props.$verticalAlign};

    min-width: ${(props) => props.$minWidth};
    width: ${(props) => props.$width};
    max-width: ${(props) => props.$maxWidth};
    min-height: ${(props) => props.$minHeight};
    height: ${(props) => props.$height};
    max-height: ${(props) => props.$maxHeight};

    margin: ${(props) => props.$margin ? props.$margin + " !important" : null};
    padding: ${(props) => props.$padding ? props.$padding + " !important" : null};
    margin-left: ${(props) => props.$marginLeft ? props.$marginLeft + " !important" : null};
    margin-right: ${(props) => props.$marginRight ? props.$marginRight + " !important" : null};
    margin-top: ${(props) => props.$marginTop ? props.$marginTop + " !important" : null};
    margin-bottom: ${(props) => props.$marginBottom ? props.$marginBottom + " !important" : null};
    padding-left: ${(props) => props.$paddingLeft ? props.$paddingLeft + " !important" : null};
    padding-right: ${(props) => props.$paddingRight ? props.$paddingRight + " !important" : null};
    padding-top: ${(props) => props.$paddingTop ? props.$paddingTop + " !important" : null};
    padding-bottom: ${(props) => props.$paddingBottom ? props.$paddingBottom + " !important" : null};

    left: ${(props) => props.$left};
    right: ${(props) => props.$right};
    top: ${(props) => props.$top};
    bottom: ${(props) => props.$bottom};
`;

export const Flex = styled(Div)`
    display: flex;
`;

export const FlexRow = styled(Flex)`
    flex-direction: row;
`;

export const FlexColumn = styled(Flex)`
    flex-direction: column;
`;

export const FlexRowFullWidth = styled(FlexRow)`
    width: 100%;
`;

export const FlexColumnFullWidth = styled(FlexColumn)`
    width: 100%;
`;

export const Link = styled.a<{$fontSize?: string}>`
    color: ${props => props.theme['colors'].defaultLinkColor};
    font-size: ${props => props.$fontSize ? props.$fontSize : "14px"};
    text-decoration: none;
    cursor: pointer;
`;

export const LightLink = styled(Link)`
    color: ${props => props.theme['colors'].mediumTextColor};
`;

export const BoldLink = styled(Link)`
    font-weight: 600;
`;

export const Section = styled.section`
    display: flex;
    flex-direction: column;
    padding-top: 10px;
`;

export const Main = styled.main`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
`;

export const ContentWrapper = styled(Div)`
    overflow-y: auto;
    margin-left: ${props => props.theme["sizes"].sideBarNavWidthDefault};

    @media (min-width: ${props => props.theme["breakpoints"].md}px) and 
            (max-width: ${props => props.theme["breakpoints"].lg - 1}px) {

        margin-left: ${props => props.theme["sizes"].sideBarNavWidthNarrow};
    }
        
    @media (max-width: ${props => props.theme["breakpoints"].md - 1}px) {
        margin-left: 0;
    }
`;