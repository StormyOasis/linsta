import axios from "axios";

let host = "http://localhost:3001"; //TODO: From config or env

export type ServiceResponse = {
    data: any;
    status: number;
    statusText: string;
}

export const postAccountsAttempt = async (data: any): Promise<ServiceResponse> => {
    const res = await axios.post(`${host}/accounts/attempt/`, data);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText,
    }
};

export const getAccountsCheckUserUnique = async (value: string | number): Promise<ServiceResponse> => {
    const res = await axios.get(`${host}/accounts/check/${value}`);
    return {
        data: res.data,
        status: res.status,
        statusText: res.statusText
    }
};

export default [postAccountsAttempt, getAccountsCheckUserUnique];