import React from "react";
import { ThemeProvider } from "styled-components";

const defaultTheme = {
    colors: {
        buttonTextColorDefault: "white",
        backgroundColor: "white",
        borderDefaultColor: "rgb(220, 220, 220)",
        borderDarkColor: "rgb(180,180, 180)",
        inputBackgroundColor: "rgb(250, 250, 250)",
        navLinkHoverColor: "rgb(236, 236, 236)",
        buttonDefaultColor: "rgb(0, 150, 245)",
        buttonDefaultColorTrans: "rgba(0, 150, 245, .5)",
        buttonOnHoverColor: "rgb(25, 120, 240)",
        inputTextColor: "rgb(115,115,115)",
        navLinkTextColor: "rgb(0, 50, 100)",
        cropperAspectBkgnd: "rgba(25,25,25,.6)",
        cropperAspectBkgndNoTrans: "rgb(25,25,25)",
    },    

    input: {
        backgroundColor: "#EFEFEF",        
    },

    sizes: {
        sideBarNavWidthDefault: "244px",
        sideBarNavWidthNarrow: "72px",
        sideBarNavBottomHeight: "50px",
        cropperHeight: "275px",
        defaultModalWidth: "450px",
        maxModalWidth: "600px",
        maxModalHeight: "350px",
        minModalHeight: "300px",
        minPostTextEditorHeight: "150px",
        maxPostTextEditorHeight: "170px"
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
