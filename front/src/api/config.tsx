export const PORT = process?.env?.REACT_APP_PORT || 8080;
export const HOST = process?.env?.REACT_APP_HOST || `http://localhost:${PORT}`;
export const API_HOST = process?.env?.REACT_APP_API_HOST || "http://localhost:3001";
export const METRICS_HOST = process?.env?.REACT_APP_METRICS_HOST || "http://localhost";
export const METRICS_PORT = process?.env?.REACT_APP_METRICS_PORT || 8125;
export const DEFAULT_PFP = `${HOST}/public/images/profile-user-default-pfp.svg`;