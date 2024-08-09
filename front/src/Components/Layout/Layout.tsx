import React from "react";
import { styled } from "styled-components";
import { Route, Routes } from "react-router-dom";
import { connect } from "react-redux";
import { Store } from "/src/Components/state/store";
import LoginLayout from "/src/Components/Layout/Login/LoginLayout";
import { MainLayout } from "/src/Components/Layout/Main/MainLayout";
import Header from "/src/Components/Layout/Header";
import { SignupLayout } from "/src/Components/Layout/Signup/SignupLayout";
import ForgotPasswordLayout from "/src/Components/Layout/Login/ForgotPasswordLayout";
import ChangePasswordLayout from "/src/Components/Layout/Login/ChangePasswordLayout";

const Section = styled.section`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
`;

const ModalContainer = styled.div`
    justify-content: center;  
    display: flex;
    align-items: flex-start;
    background-color: rgba(0,0,0,.6);
    min-width: 100%;
    max-width: 100%;
    z-index: 9999;
    position: fixed;
`

type LayoutProps = {
    location: string,
    isLoggedIn?: boolean
};

type LayoutState = {};

class Layout extends React.Component<LayoutProps, LayoutState> {

    constructor(props: LayoutProps) {
        super(props);
    }

    renderHeader = () => {
        // Don't want to display the header on the login or signup routes
        // or if user is logged in
        if (this.props.isLoggedIn ||
            this.props.location.endsWith("/login") ||
            this.props.location.endsWith("/signup")) {
            return null;
        }

        return (
            <Header />
        );
    }

    renderLayout = () => {
        return (
            <>
                <Section id="mainSectionContainer">
                    {this.renderHeader()}
                    <Routes>
                        <Route path="*" element={<MainLayout />} />
                        <Route path="/login/*" element={<LoginLayout />} />
                        <Route path="/signup/*" element={<SignupLayout />} />
                        <Route path="/forgot/*" element={<ForgotPasswordLayout />} />
                        <Route path="/change_password/*" element={<ChangePasswordLayout />} />
                    </Routes>
                </Section>
            </>
        );
    }

    override render() {
        return (
            <>
                <ModalContainer id="modalContainer" />
                {this.renderLayout()}
            </>
        );
    }
}

const mapStateToProps = (state: Store) => ({
    isLoggedIn: state.isLoggedIn,
});

export default connect(mapStateToProps)(Layout);