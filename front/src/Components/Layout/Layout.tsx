import React from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
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
import ProfileLayout from "./Profile/ProfileLayout";
import NotFoundLayout from "./NotFoundLayout";

const Layout: React.FC = () => {
    const authUser = useSelector((value:any) => value?.auth?.user);
     
    const RedirectToProfilePage = () => {
        const { userName } = useParams();
        const location = useLocation();

        // Redirect if the URL has a trailing slash
        if (location.pathname.endsWith('/') && location.pathname !== `/${userName}/`) {
            return <Navigate to={`/${userName}`} replace />;
        }        
    
        return <ProfileLayout edit={false} />;
    } 

    const renderHeader = () => {
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
            <FlexColumn id="mainSectionContainer">
                <ModalManager />
                {renderHeader()}
                <Routes>
                    <Route path="/" element={<Private><MainLayout /></Private>} />                                         
                    <Route path="/:userName" element={<ProfileLayout edit={false} />} />
                    <Route path="/:userName/" element={<RedirectToProfilePage/>} />
                    <Route path="/edit/*" element={<Private><ProfileLayout edit={true} /></Private>} />
                    <Route path="/login/*" element={<LoginLayout />} />
                    <Route path="/signup/*" element={<SignupLayout />} />
                    <Route path="/forgot/*" element={<ForgotPasswordLayout />} />
                    <Route path="/change_password/*" element={<ChangePasswordLayout />} />
                    <Route path="/404" element={<NotFoundLayout />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </FlexColumn>
        </>
    );
}

export default Layout;