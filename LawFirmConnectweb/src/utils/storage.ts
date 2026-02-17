const STORAGE_KEY = 'user';

export const setAuthData = (data: unknown, rememberMe: boolean) => {
  const json = JSON.stringify(data);
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEY, json);
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, json);
    localStorage.removeItem(STORAGE_KEY);
  }
};

export const getAuthData = (): unknown | null => {
  const data = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const getAuthToken = (): string | null => {
  const data = getAuthData() as { token?: string } | null;
  return data?.token || null;
};

export const clearAuthData = () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
};
