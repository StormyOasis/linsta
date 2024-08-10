import { postLogin } from "./ServiceController";

export type AuthUser = {
    token: string;
    id: string;
    userName: string;
}

export const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('user') as string) as AuthUser;
    if (user == null) {
        return {};
    }

    if (user && user.token) {
        return { 'x-access-token': user.token };
    }

    return {};
}

export const login = async (userName: string, password: string) => {
    if (userName.trim().length === 0 || password.trim().length === 0) {
        return false;
    }

    const result = await postLogin({ userName, password });

    if (result == null || result.status != 200 || result.data == null || result.data.token == null) {
        return false;
    }

    localStorage.setItem("user", JSON.stringify(result.data));

    return true;
}

export const logout = () => {
    localStorage.removeItem("user");
}

export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    if (user == null) {
        return null;
    }
    return JSON.parse(user);
}