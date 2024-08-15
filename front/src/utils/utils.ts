export const validatePassword = (value: string): boolean => {
    const regex:RegExp =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&^])[A-Za-z\d@.#$!%*?&]{8,15}$/;
        
    return regex.test(value);
};

export const validateEmailPhone = (value: string): boolean => {
    if (value == null) {
        return false;
    }

    const phoneRegex = /(?:([+]\d{1,4})[-.\s]?)?(?:[(](\d{1,3})[)][-.\s]?)?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9})/g;
    const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return emailRegex.test(value) || phoneRegex.test(value);
};

export const validateFullName = (value: string): boolean => {
    return (
        value !== null &&
        value.trim().length > 0 &&
        value.trim().split(" ").length > 1
    );
};

export type HistoryType = {
    navigate: any,
    location: any,
    isServer: boolean
};

export const historyUtils:HistoryType = {
    navigate: null,
    location: null,
    isServer: true
}