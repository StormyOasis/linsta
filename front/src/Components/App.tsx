import React, { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import Layout from "../Components/Layout/Layout";
import Theme from "../Components/Themes/Theme";
import { historyUtils } from "../utils/utils";
import { useSelector } from "react-redux";
import { useAppDispatch } from "./Redux/redux";
import { getProfileByUserId } from "./Redux/slices/profile.slice";

const App: React.FC<any> = ({ children }) => {
    const [isServer, setIsServer] = useState<boolean>(true);
    const authUser = useSelector((value: any) => value?.auth?.user);

    const dispatch = useAppDispatch();

    //UseEffect only runs on the client      
    useEffect(() => {
        setIsServer(false);

        if (authUser && authUser.id != null) {
            dispatch(getProfileByUserId({ userId: authUser.id }));
        }
    }, [authUser]);

    historyUtils.location = useLocation();
    historyUtils.navigate = useNavigate();
    historyUtils.isServer = isServer;

    return (
        <React.StrictMode>
            <ErrorBoundary FallbackComponent={({ error }) => <div data-testid="fallback">{error.stack}</div>}>
                {children}
                <Theme>
                    <Layout />
                </Theme>
            </ErrorBoundary>
        </React.StrictMode>
    )
}

export default App;