import React from "react";
import { styled } from "styled-components";

type LoginLayoutProps = {};

type LoginState = {
    isLoggedIn: boolean;
};

const LoginLayoutWrapper = styled.div<any>`
  display: flex;
  margin: 0;
  padding: 0;
`;

export class LoginLayout extends React.Component<
    LoginLayoutProps,
    LoginState> {

    override render() {
        return (
            <>
                <LoginLayoutWrapper>
                    <section>
                        <main>LoginLayout</main>
                    </section>
                </LoginLayoutWrapper>
            </>
        );
    }
}
