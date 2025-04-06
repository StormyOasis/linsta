import React from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import LoginLayout from "../../Components/Layout/Login/LoginLayout";
import MainLayout from "../../Components/Layout/Main/MainLayout";
import Header from "../../Components/Layout/Header";
import SignupLayout from "../../Components/Layout/Signup/SignupLayout";
import ForgotPasswordLayout from "../../Components/Layout/Login/ForgotPasswordLayout";
import ChangePasswordLayout from "../../Components/Layout/Login/ChangePasswordLayout";
import Private from "../Common/Private";
import { FlexColumn } from "../Common/CombinedStyling";
import ModalManager from "../../Components/Layout/Main/Modals/ModalManager";
import ProfileLayout from "./Profile/ProfileLayout";
import NotFoundLayout from "./NotFoundLayout";

const Layout: React.FC = () => {
    const RedirectToProfilePage = () => {
        const { userName } = useParams();
        const location = useLocation();

        // Redirect if the URL has a trailing slash
        if (location.pathname.endsWith('/') && location.pathname !== `/${userName}/`) {
            return <Navigate to={`/${userName}`} replace />;
        }        
    
        return <ProfileLayout edit={false} />;
    } 

    return (
        <>            
            <FlexColumn id="mainSectionContainer">
                <ModalManager />
                <Routes>
                    <Route path="/" element={<Private><MainLayout /></Private>} />                                         
                    <Route path="/:userName" element={<ProfileLayout edit={false} />} />
                    <Route path="/:userName/" element={<RedirectToProfilePage/>} />
                    <Route path="/edit/*" element={<Private><ProfileLayout edit={true} /></Private>} />
                    <Route path="/login/*" element={<LoginLayout />} />
                    <Route path="/signup/*" element={<SignupLayout />} />
                    <Route path="/forgot/*" element={<><Header /><ForgotPasswordLayout /></>} />
                    <Route path="/change_password/*" element={<><Header /><ChangePasswordLayout /></>} />
                    <Route path="/404" element={<NotFoundLayout />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </FlexColumn>
        </>
    );
}

export default Layout;