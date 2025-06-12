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
import NotFoundLayout from "./NotFoundLayout";
import ExploreLayout from "./Explore/ExploreLayout";
import loadable from '@loadable/component';

const LazyProfileLayout = loadable(() => import('./Profile/ProfileLayout'));
const LazyModalManager = loadable(() => import('../../Components/Layout/Main/Modals/ModalManager'));

// Trailing slash redirect handler
const RedirectToProfilePage: React.FC = () => {
    const { userName } = useParams();
    const location = useLocation();

    // Always redirect if path ends in slash
    if (location.pathname.endsWith('/')) {
        return <Navigate to={`/${userName}`} replace />;
    }

    return <LazyProfileLayout edit={false} />;
};

const Layout: React.FC = () => {
    return (
        <>            
            <FlexColumn id="mainSectionContainer">
                <LazyModalManager />
                <Routes>
                    <Route path="/" element={<Private><MainLayout /></Private>} />                                         
                    <Route path="/edit/*" element={<Private><LazyProfileLayout edit={true} /></Private>} />
                    <Route path="/explore/*" element={<Private><ExploreLayout /></Private>} />                    
                    <Route path="/login/*" element={<LoginLayout />} />
                    <Route path="/signup/*" element={<SignupLayout />} />
                    <Route path="/forgot/*" element={<><Header /><ForgotPasswordLayout /></>} />
                    <Route path="/change_password/*" element={<><Header /><ChangePasswordLayout /></>} />
                    <Route path="/404" element={<NotFoundLayout />} />
                    <Route path="/:userName/" element={<RedirectToProfilePage />} />
                    <Route path="/:userName" element={<LazyProfileLayout edit={false} />} />                    
                </Routes>
            </FlexColumn>
        </>
    );
}

export default Layout;