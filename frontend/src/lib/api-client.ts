import axios from "axios";

const apiBaseUrl =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")) ||
  "http://localhost:3000";

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("access_token");
        if (token && token.trim() !== "") {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // localStorage erişilemezse isteği tokensız gönder
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default apiClient;
