import React from "react";
import { connect } from "react-redux";
import { Store } from "/src/Components/state/store";
import styled from "styled-components";

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

const mapStateToProps = (state:Store) => ({
    isLoggedIn: state.isLoggedIn
});

export default connect(mapStateToProps)(MainLayout);