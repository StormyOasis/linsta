import React from "react";
import Theme from "../../../Components/Themes/Theme";

import SideBar from "../Main/SideBar";
import ProfileContent from "./ProfileContent";
import * as styles from '../Main/Main.module.css';
import EditProfileContent from "./EditProfileContent";

type ProfileLayoutProps = {
    edit: boolean;
}

const ProfileLayout: React.FC<ProfileLayoutProps> = (props: ProfileLayoutProps) => {
    return (
        <Theme>
            <div className={styles.mainWrapper}>
                <SideBar />
                {props.edit && <EditProfileContent /> }
                {!props.edit && <ProfileContent /> }                
            </div>
        </Theme>
    );
}

export default ProfileLayout;