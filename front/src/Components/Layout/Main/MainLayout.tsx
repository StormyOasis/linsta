import React from "react";
import  styled from "styled-components";


type MainLayoutProps = {
};

type MainState = {
};

const MainWrapper = styled.main`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
`;

export class MainLayout extends React.Component {

    override render() {
        return (
            <>
                <MainWrapper role="main">
                    MainLayout
                </MainWrapper>
            </>
        );
    }
}