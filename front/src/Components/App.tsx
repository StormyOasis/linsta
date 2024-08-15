import React, { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import Layout from "../Components/Layout/Layout";
import Theme from "../Components/Themes/Theme";
import { historyUtils } from "../utils/utils";

const App: React.FC<any> = ({children}) => {
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