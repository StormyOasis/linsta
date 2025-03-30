import React from "react";
import Theme from "../../../Components/Themes/Theme";

import SideBar from "../Main/SideBar";
import ProfileContent from "./ProfileContent";
import * as styles from '../Main/Main.module.css';
import EditProfileContent from "./EditProfileContent";
import { Div } from "../../../Components/Common/CombinedStyling";

type ProfileLayoutProps = {
    edit: boolean;
}

const ProfileLayout: React.FC<ProfileLayoutProps> = (props: ProfileLayoutProps) => {
    return (
        <Theme>
            <Div className={styles.mainWrapper}>
                <SideBar />
                {props.edit && <EditProfileContent /> }
                {!props.edit && <ProfileContent /> }                
            </Div>
        </Theme>
    );
}

export default ProfileLayout;