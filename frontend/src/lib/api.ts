import axios from 'axios';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    // Se estiver acessando localmente, fala com o backend correspondente à porta
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port === '3001') {
        return 'http://localhost:8001';
      }
      if (port === '3002') {
        return 'http://localhost:8002';
      }
      if (port === '3000') {
        return 'http://localhost:8000';
      }
      // Se acessado via porta padrão (80/443), usa o próprio origin (para o Traefik)
      return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    }
    // Se for subdomínio de teste local
    if (hostname.endsWith('.localhost')) {
      return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    }
    // Caso contrário, usa o domínio oficial
    return 'https://api.gestaofinora.com.br';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
