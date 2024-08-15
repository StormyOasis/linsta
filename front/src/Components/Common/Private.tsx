import React from "react";
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from "../../Components/Redux/redux";
import { historyUtils } from "../../utils/utils";

const Private = ({ children }:any) => {

    const { user } = useSelector((state:RootState) => state.auth);
    
    if (!historyUtils.isServer && !user) {
        return <Navigate to="/login" state={{ from: historyUtils.location }} />
    }
    if(historyUtils.isServer) {
        return null;
    }

    return children;
}

export default Private;