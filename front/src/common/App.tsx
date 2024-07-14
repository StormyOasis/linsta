import React from "react"
import { Provider } from 'react-redux';
import { ErrorBoundary } from "react-error-boundary";

import Header from "./Components/Header";
import Html from "./render";

const App = (props: any) => {
  return (
    <React.StrictMode>
      <Html title="Linstagram" initialState={props.initialState}>
        <Provider store={props.store}>
          <ErrorBoundary FallbackComponent={({error}) => <div>{error.stack}</div>}>
            <div className="container">            
              <Header />
            </div>
          </ErrorBoundary>
        </Provider>
      </Html>
    </React.StrictMode>
  )
}

export default App;