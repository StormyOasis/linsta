import React, { useEffect, useState } from "react"
import { Provider } from 'react-redux';
import { useLocation } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import Layout from "../Components/Layout/Layout";
import store from "../Components/state/redux";
import Theme from "../Components/Themes/Theme";


const App: React.FC<{ any: any }> = () => {
  const isOnServer = () => {
    const [isServer, setIsServer] = useState(true);

    //UseEffect only runs on the client
    useEffect(() => {
      setIsServer(false);
    }, []);

    return isServer;
  }

  const location = useLocation().pathname.toLowerCase();
  const isServer = isOnServer();

  if(!isServer) {
    console.log(localStorage.getItem("user"));
  }

  return (
    <React.StrictMode>
      <Provider store={store}>
        <ErrorBoundary FallbackComponent={({ error }) => <div>{error.stack}</div>}>
          <Theme>
            <Layout location={location} />
          </Theme>
        </ErrorBoundary>
      </Provider>
    </React.StrictMode>
  )
}

export default App;