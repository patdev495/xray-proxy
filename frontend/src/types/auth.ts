export interface User {
  id: number;
  username: string;
  role: 'ADMIN' | 'CUSTOMER';
  is_active: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}
