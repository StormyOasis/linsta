import React, { useState } from "react";
import Theme from "../../../Components/Themes/Theme";
import styled from "styled-components";
import SideBar from "./SideBar";
import MainContent from "./MainContent";
import * as styles from './Main.module.css';
import CreatePostModal from "./Flows/CreatePost/CreatePostModal";
import { enableModal } from "../../../utils/utils";


const MainLayout: React.FC = () => {
    const [createPostModalVisible, setCreatePostModalVisible] = useState(false);

    const createPostHandler = () => {
        setCreatePostModalVisible(true);
    }

    return (
        <Theme>
            {createPostModalVisible && <CreatePostModal onClose={() => {setCreatePostModalVisible(false), enableModal(false)}}/>}
            <div className={styles.mainWrapper}>
                <SideBar createPostHandler={createPostHandler}/>
                <MainContent />
            </div>
        </Theme>
    );
}

export default MainLayout;