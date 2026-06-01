const fallbackApiBaseUrl = "http://localhost:4000";
const fallbackAppName = "Persona Classroom";

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? fallbackApiBaseUrl,
  appName: import.meta.env.VITE_APP_NAME ?? fallbackAppName,
};
