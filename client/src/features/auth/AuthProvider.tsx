import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, type PropsWithChildren } from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  signupUser,
  type LoginInput,
  type SignupInput,
} from "../../lib/api-client";
import { AuthContext, type AuthContextValue } from "./auth-context";
const AUTH_QUERY_KEY = ["auth", "me"];

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const authQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: false,
  });

  const login = useCallback(
    async (input: LoginInput): Promise<void> => {
      const user = await loginUser(input);
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
    [queryClient],
  );

  const signup = useCallback(
    async (input: SignupInput): Promise<void> => {
      const user = await signupUser(input);
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
    [queryClient],
  );

  const logout = useCallback(async (): Promise<void> => {
    await logoutUser();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
  }, [queryClient]);

  const value: AuthContextValue = {
    user: authQuery.data ?? null,
    isLoading: authQuery.isPending,
    error: authQuery.error,
    isAuthority: authQuery.data?.role === "authority",
    login,
    signup,
    logout,
    retry: () => void authQuery.refetch(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
