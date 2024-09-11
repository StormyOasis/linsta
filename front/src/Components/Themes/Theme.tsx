import React from "react";
import { ThemeProvider } from "styled-components";

const defaultTheme = {
    colors: {
        buttonTextColorDefault: "white",
        backgroundColor: "white",
        backgroundDisabled: "rgba(0, 0, 0, .6)",
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
        mediumTextColor: "rgb(120, 120, 120)",        
    },    

    input: {
        backgroundColor: "#EFEFEF",        
    },

    sizes: {
        sideBarNavWidthDefault: "244px",
        sideBarNavWidthNarrow: "72px",
        sideBarNavBottomHeight: "50px",
        cropperHeight: "275px",
        defaultModalWidth: "600px",
        maxModalWidth: "600px",
        maxModalHeight: "350px",
        minModalHeight: "300px",
        minPostTextEditorHeight: "140px",
        maxPostTextEditorHeight: "140px"
    },

    breakpoints: {
        sm: "576",
        md: "768",
        lg: "1280"
    }
};

export const LexicalEditorTheme = {
    ltr: 'ltr',
    rtl: 'rtl',
};

const Theme = ({children}: any) => {
    return <ThemeProvider theme={defaultTheme}>{children}</ThemeProvider>
};

export default Theme;
