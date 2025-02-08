import React, { useEffect } from "react";
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
import { FlexColumn } from "../Common/CombinedStyling";
import ModalManager from "../../Components/Layout/Main/Modals/ModalManager";
import { useAppDispatch } from "../Redux/redux";
import { getProfileByUserId } from "../Redux/slices/profile.slice";

const Section = styled(FlexColumn)`
    display: flex;
`;

const Layout: React.FC = () => {
    const authUser = useSelector((value:any) => value?.auth?.user);

    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(getProfileByUserId({userId: authUser.id}));
    }, []);    
    
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
            <Section id="mainSectionContainer">
                <ModalManager />
                {renderHeader()}
                <Routes>
                    <Route path="/" element={<Private><MainLayout /></Private>} />                        
                    <Route path="/profile" element={<Private></Private>} />                        
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