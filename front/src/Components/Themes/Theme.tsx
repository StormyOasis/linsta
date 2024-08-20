import React from "react";
import { ThemeProvider } from "styled-components";

const defaultTheme = {
    colors: {
        buttonTextColorDefault: "white",
        backgroundColor: "white",
        borderDefaultColor: "rgb(220, 220, 220)",
        inputBackgroundColor: "rgb(250, 250, 250)",
        navLinkHoverColor: "rgb(236, 236, 236)",
        buttonDefaultColor: "rgb(0, 150, 245)",
        buttonDefaultColorTrans: "rgba(0, 150, 245, .5)",
        buttonOnHoverColor: "rgb(25, 120, 240)",
        inputTextColor: "rgb(115,115,115)",
        navLinkTextColor: "rgb(0, 50, 100)"
    },    

    input: {
        backgroundColor: "#EFEFEF",        
    },

    sizes: {
        sideBarNavWidthDefault: "244px",
        sideBarNavWidthNarrow: "72px",
        sideBarNavBottomHeight: "50px"
    },

    breakpoints: {
        sm: "576",
        md: "768",
        lg: "1280"
    }
};

const Theme = ({children}: any) => {
    return <ThemeProvider theme={defaultTheme}>{children}</ThemeProvider>
};

export default Theme;
