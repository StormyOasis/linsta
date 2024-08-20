import React from "react";
import styled from "styled-components";
import * as styles from './Main.module.css';

const MainContentWrapper = styled.div`
    overflow-y: auto;
    margin-left: ${props => props.theme["sizes"].sideBarNavWidthDefault};
    padding-left: 10px;

    @media (min-width: ${props => props.theme["breakpoints"].md}px) and 
            (max-width: ${props => props.theme["breakpoints"].lg - 1}px) {

        margin-left: ${props => props.theme["sizes"].sideBarNavWidthNarrow};
    }
        
    @media (max-width: ${props => props.theme["breakpoints"].md-1}px) {
        margin-left: 0;
        padding-left: 0;
    }
`;

const MainContent: React.FC = () => {
    return (
        <MainContentWrapper>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>                    
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>                    
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut non nulla vitae arcu bibendum molestie vel quis lacus. Vestibulum sed lacinia enim. Curabitur pretium sed arcu accumsan commodo. Proin consequat turpis ac neque lobortis, sed aliquam risus bibendum. Nullam quis sem non turpis molestie dictum. Sed ullamcorper, metus id viverra eleifend, erat justo tincidunt nulla, non maximus arcu ligula ac lorem. Maecenas a sapien lorem. Praesent scelerisque lectus mauris, ac molestie augue condimentum nec.</p>                                                                        
        </MainContentWrapper>        
    );    
}

export default MainContent;