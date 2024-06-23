import React, { useEffect, useState } from "react"
import styled from 'styled-components';
import { Provider } from 'react-redux';
import store from './store';

const Title = styled.h1`
  color: red;
`

const App = () => {
 /*8 useEffect(() => {
    fetch("http://localhost:3001")
      .then((response) => response.json())
      .catch((error) => console.log(error))
  }, [])*/

  return (
    <Provider store={store}>
      <div className="container">
        <Title>Linsta - Front</Title>
      </div>
    </Provider>
  )
}

export default App