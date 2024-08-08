export interface ReduxAction {
    type: string;
    payload?: string;
    error?: boolean;
    meta?: any;
};

export const LOG_IN_USER_ACTION = 'LOG_IN_USER_ACTION';
export const LOG_OUT_USER_ACTION = 'LOG_OUT_USER_ACTION';