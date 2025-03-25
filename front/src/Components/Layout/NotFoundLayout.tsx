import React from 'react';

import { Div, FlexColumn } from "../Common/CombinedStyling";
import StyledLink from "../Common/StyledLink";
import Theme from '../Themes/Theme';
import SideBar from './Main/SideBar';
import { historyUtils } from '../../utils/utils';
import { useAppSelector } from '../Redux/redux';
import { AuthUser } from '../../api/Auth';

const NotFoundLayout: React.FC = () => {
    const authUser:AuthUser = useAppSelector((value:any) => value?.auth?.user);
    const isLoggedIn = (!historyUtils.isServer && authUser && authUser.token != null);

    return (
        <Theme>
            <Div>
                {isLoggedIn && <SideBar />}
                <FlexColumn $height="fit-content" $width="fit-content" $alignContent="center" 
                    style={{padding: "40px", margin: "auto", flexWrap: "wrap", alignItems: "center"}}>

                    <Div $lineHeight="128px" $fontSize="24px" $fontWeight="700">Sorry, this page is not available</Div>
                    <StyledLink to="/">Go Back to Linstagram</StyledLink>
                </FlexColumn>
            </Div>
        </Theme>        
    );
};

export default NotFoundLayout;