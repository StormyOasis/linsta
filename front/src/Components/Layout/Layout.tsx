import React from "react";
import { Route, Routes} from "react-router-dom";
import { connect } from "react-redux";
import { Store } from "src/common/state/store";
import { LoginLayout } from "./Login/LoginLayout";
import { MainLayout } from "./Main/MainLayout";
import Header from "./Header";
import { styled } from "styled-components";
import { SignupLayout } from "./Signup/SignupLayout";

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
    
    constructor (props: LayoutProps) {
        super(props);        
    }

    renderHeader = () => {
        // Don't want to display the header on the login or signup routes
        // or if user is logged in
       /* if(this.props.isLoggedIn || 
            this.props.location.endsWith("/login") || 
            this.props.location.endsWith("/signup"))  {
                return null;
        }*/

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