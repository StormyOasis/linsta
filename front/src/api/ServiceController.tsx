import axios from "axios";
import { authHeader } from "./Auth";

let host = "http://localhost:3001"; //TODO: From config or env

export type ServiceResponse = {
    data: any;
    status: number;
    statusText: string;
}

export const postAccountsAttempt = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/accounts/attempt/`, data);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
};

export const getAccountsCheckUserUnique = async (value: string | number): Promise<ServiceResponse> => {
    const res = await axios.get(`${host}/api/v1/accounts/check/${value}`);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText
    }
};

export const getAccountsSendVerifyNotification = async (userData: string): Promise<ServiceResponse>  => {
    const res = await axios.get(`${host}/api/v1/accounts/send_confirm_code?user=${userData}`);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText
    }
}

export const postLogin = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/accounts/login`, data);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postForgotPassword = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/accounts/forgot`, data);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}

export const postChangePassword = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/api/v1/accounts/change_password`, data);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
}