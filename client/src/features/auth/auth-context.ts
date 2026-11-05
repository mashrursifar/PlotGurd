import { createContext } from "react";
import type { AuthUser, LoginInput, SignupInput } from "../../lib/api-client";

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  isAuthority: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
