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
import AboutLayout from "./AboutLayout";

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
                <AboutLayout />
            </FlexColumn>
        </>
    );
}

export default Layout;