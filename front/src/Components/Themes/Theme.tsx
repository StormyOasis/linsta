import React from "react";
import { ThemeProvider } from "styled-components";

const defaultTheme = {
    colors: {
        buttonTextColorDefault: "white",
        backgroundColor: "white",
        borderDefaultColor: "rgb(220, 220, 220)",
        inputBackgroundColor: "rgb(250, 250, 250)",
        buttonDefaultColor: "rgb(0, 150, 245)",
        buttonDefaultColorTrans: "rgba(0, 150, 245, .5)",
        buttonOnHoverColor: "rgb(25, 120, 240)",
        inputTextColor: "rgb(115,115,115)",
    },    

    input: {
        backgroundColor: "#EFEFEF",        
    },    
};

const Theme = ({children}: any) => {
    return <ThemeProvider theme={defaultTheme}>{children}</ThemeProvider>
};

export default Theme;
