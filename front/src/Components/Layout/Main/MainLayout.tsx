import React from "react";
import Theme from "../../../Components/Themes/Theme";

import SideBar from "./SideBar";
import MainContent from "./MainContent";
import * as styles from './Main.module.css';

const MainLayout: React.FC = () => {
    return (
        <Theme>
            <div className={styles.mainWrapper}>
                <SideBar />
                <MainContent />
            </div>
        </Theme>
    );
}

export default MainLayout;