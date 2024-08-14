import React, { useEffect, useState } from "react"
import { Provider } from 'react-redux';
import { useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import Layout from "../Components/Layout/Layout";
import store from "../Components/Redux/redux";
import Theme from "../Components/Themes/Theme";
import { historyUtils } from "../utils/utils";

const App: React.FC = () => {
  const isOnServer = () => {
    const [isServer, setIsServer] = useState(true);

    //UseEffect only runs on the client
    useEffect(() => {
      setIsServer(false);
    }, []);

    return isServer;
  }

  historyUtils.location = useLocation();
  historyUtils.navigate = useNavigate();
  historyUtils.isServer = isOnServer();

  return (
    <React.StrictMode>
      <Provider store={store}>
        <ErrorBoundary FallbackComponent={({ error }) => <div>{error.stack}</div>}>
          <Theme>
            <Layout />
          </Theme>
        </ErrorBoundary>
      </Provider>
    </React.StrictMode>
  )
}

export default App;