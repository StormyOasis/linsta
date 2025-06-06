import { postLogin } from "./ServiceController";

export type AuthUser = {
    token: string;
    id: string;
    userName: string;
}

export const authHeader = () => {
    const headers:any = {};

    // Authentication and Authorization via JWT
    const user = JSON.parse(localStorage.getItem('user') as string) as AuthUser;
    if (user == null) {
        return headers;
    }

    if (user && user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
    }

    return headers;
}

export const login = async (userName: string, password: string) => {    
    if (userName.trim().length === 0 || password.trim().length === 0) {
        throw new Error("Invalid username or password");
    }

    const result = await postLogin({ userName, password });

    if (result == null || result.status != 200 || result.data == null || result.data.token == null) {
        throw new Error("Invalid username or password");
    }

    return result.data;
}

export const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("recentSearches");
}

export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    if (user == null) {
        return null;
    }
    return JSON.parse(user);
}