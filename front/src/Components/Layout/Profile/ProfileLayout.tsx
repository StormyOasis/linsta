import React from "react";
import Theme from "../../../Components/Themes/Theme";

import SideBar from "../Main/SideBar";
import ProfileContent from "./ProfileContent";
import * as styles from '../Main/Main.module.css';

const ProfileLayout: React.FC = () => {
    return (
        <Theme>
            <div className={styles.mainWrapper}>
                <SideBar />
                <ProfileContent />
            </div>
        </Theme>
    );
}

export default ProfileLayout;