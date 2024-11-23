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

export const Flex = styled.div`
    display: flex;
`;

export const FlexRow = styled(Flex)`
    flex-direction: row;
`;

export const FlexColumn = styled(Flex)`
    flex-direction: column;
`;

export const Link = styled.a`
    color: ${props => props.theme['colors'].defaultLinkColor};
    text-decoration: none;
`;