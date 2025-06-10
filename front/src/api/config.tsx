
const isBrowser = typeof window !== 'undefined';

export const PORT = isBrowser ? window.env.REACT_APP_PORT : (process?.env?.REACT_APP_PORT || 8080);
export const HOST = isBrowser ? window.env.REACT_APP_HOST : (process?.env?.REACT_APP_HOST || `http://localhost:${PORT}`);
export const API_HOST = isBrowser ? window.env.REACT_APP_API_HOST : (process?.env?.REACT_APP_API_HOST || "http://localhost:3001");
export const METRICS_HOST = isBrowser ? window.env.REACT_APP_METRICS_HOST : (process?.env?.REACT_APP_METRICS_HOST || "http://localhost");
export const METRICS_PORT = isBrowser ? window.env.REACT_APP_METRICS_PORT : (process?.env?.REACT_APP_METRICS_PORT || 8125);
export const DEFAULT_PFP = `${HOST}/public/images/profile-user-default-pfp.svg`;
export const SPRITE_PATH = `${HOST}/public/images/sprite.svg`;