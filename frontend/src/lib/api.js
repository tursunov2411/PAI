import axios from "axios";

let tokenGetter = null;

export const setTokenGetter = (getter) => {
  tokenGetter = getter;
};

export const clearTokenGetter = () => {
  tokenGetter = null;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

api.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/") {
      window.location.href = "/";
    }

    return Promise.reject(error);
  },
);

export default api;

