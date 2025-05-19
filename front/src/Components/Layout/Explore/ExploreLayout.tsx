import React from "react";
import Theme from "../../Themes/Theme";

import SideBar from "../Main/SideBar";
import ExploreContent from "./ExploreContent";
import * as styles from '../Main/Main.module.css';
import { Div } from "../../Common/CombinedStyling";

const ExploreLayout: React.FC = () => {
    return (
        <Theme>
            <Div className={styles.mainWrapper}>
                <SideBar />
                <ExploreContent />
            </Div>
        </Theme>
    );
}

export default ExploreLayout;