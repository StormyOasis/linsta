export const validatePassword = (value: string): boolean => {
    const regex:RegExp =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&^])[A-Za-z\d@.#$!%*?&]{8,15}$/;

    return regex.test(value);
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