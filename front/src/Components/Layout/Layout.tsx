import React from "react";
import { styled } from "styled-components";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginLayout from "../../Components/Layout/Login/LoginLayout";
import MainLayout from "../../Components/Layout/Main/MainLayout";
import Header from "../../Components/Layout/Header";
import SignupLayout from "../../Components/Layout/Signup/SignupLayout";
import ForgotPasswordLayout from "../../Components/Layout/Login/ForgotPasswordLayout";
import ChangePasswordLayout from "../../Components/Layout/Login/ChangePasswordLayout";
import { historyUtils } from "../../utils/utils";
import { useSelector } from "react-redux";
import Private from "../Common/Private";

const Section = styled.div`
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
const Layout: React.FC = () => {
    const authUser = useSelector((value:any) => value?.auth?.user);
    
    const renderHeader = () => {
        //const path = historyUtils.location.pathname.toLowerCase();
        // Don't want to display the header on the login or signup routes
        // or if user is logged in
        if ((!historyUtils.isServer && authUser && authUser.token != null)) {
            return null;
        }

        return (
            <Header />
        );
    }

    return (
        <>
            <ModalContainer id="modalContainer" />
            <Section id="mainSectionContainer">
                {renderHeader()}
                <Routes>
                    <Route path="/" element={<Private><MainLayout /></Private>} />                        
                    <Route path="/login/*" element={<LoginLayout />} />
                    <Route path="/signup/*" element={<SignupLayout />} />
                    <Route path="/forgot/*" element={<ForgotPasswordLayout />} />
                    <Route path="/change_password/*" element={<ChangePasswordLayout />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Section>
        </>
    );
}

export default Layout;