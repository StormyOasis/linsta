import React from "react";
import Theme from "../../../Components/Themes/Theme";
import styled from "styled-components";
import SideBar from "./SideBar";
import * as styles from './Main.module.css';

const MainWrapper = styled.div`
    overflow: hidden;
    overflow-y: auto;
    height: 100vh;
`;

const MainContent = styled.div`
    overflow-y: auto;
    margin-left: ${props => props.theme["sizes"].sideBarNavWidthDefault};
    padding-left: 10px;

    @media (min-width: 768px) and (max-width: 1279px) {
        margin-left: ${props => props.theme["sizes"].sideBarNavWidthNarrow};
    }
        
    @media (max-width: 767px) {
        margin-left: 0;
        padding-left: 0;
    }
`;


const MainLayout: React.FC = () => {
    return (
        <Theme>
            <MainWrapper>
                <SideBar />
                <MainContent>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>                    
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>                    
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>                                                            
                </MainContent>
            </MainWrapper>
        </Theme>
    );
}

export default MainLayout;