import React from "react";
import { ThemeProvider } from "styled-components";

const defaultTheme = {
    colors: {
        defaultLinkColor: "black",
        defaultTextColor: "black",
        backgroundColor: "white",
        backgroundColorSecondary: "black",
        backgroundDisabled: "rgba(0, 0, 0, .6)",
        borderDefaultColor: "rgb(220, 220, 220)",
        borderDarkColor: "rgb(180,180, 180)",
        inputBackgroundColor: "rgb(250, 250, 250)",
        navLinkHoverColor: "rgb(236, 236, 236)",
        buttonTextColorDefault: "white",
        buttonSecondaryTextColorDefault: "black",
        buttonDefaultColor: "rgb(0, 150, 245)",
        buttonDefaultSecondaryColor: "rgb(240, 240, 240)",
        buttonDefaultColorTrans: "rgba(0, 150, 245, .5)",
        buttonSecondaryDefaultColorTrans: "rgba(240, 240, 240, .5)",
        buttonOnHoverColor: "rgb(25, 120, 240)",        
        buttonSecondaryOnHoverColor: "rgb(220, 220, 220)",        
        inputTextColor: "rgb(115,115,115)",
        navLinkTextColor: "rgb(0, 50, 100)",
        cropperAspectBkgnd: "rgba(25,25,25,.6)",
        cropperAspectBkgndNoTrans: "rgb(25,25,25)",
        mediumTextColor: "rgb(120, 120, 120)",  
        mediaSliderButtonColor: "rgba(0,0,0, .6)",
        mediaSliderButtonBkgndColor: "rgba(225,225,225, .4)",
        warningTextColor: "rgb(235, 70, 90)"
    },    

    input: {
        backgroundColor: "#EFEFEF",        
    },

    sizes: {
        sideBarNavWidthDefault: "244px",
        sideBarNavWidthNarrow: "72px",
        sideBarNavBottomHeight: "50px",
        searchPanelWidth: "300px",
        cropperHeight: "275px",
        defaultModalWidth: "600px",
        maxModalWidth: "45vw",
        maxModalHeight: "75vh",
        minModalHeight: "300px",
        minPostTextEditorHeight: "140px",
        maxPostTextEditorHeight: "140px",
        feedPostMinWidth: "400px",
        maxCommentModalContentHeight: "75vh",
        minCommentModalContentHeight: "300px",
    },

    breakpoints: {
        xs: "480",   // Extra small
        sm: "576",   // Small (mobile)
        md: "768",   // Medium (tablet)
        lg: "1280",  // Large (desktop)
        xl: "1440",  // Extra Large (widescreen desktop)
        xxl: "1600"  // Ultra Large (4K-friendly)
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
