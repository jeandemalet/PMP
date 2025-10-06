import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count?: {
    images: number;
    jobs: number;
  };
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials {
  email: string;
  password: string;
  name?: string;
}

// Hook pour récupérer les informations utilisateur
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async (): Promise<User | null> => {
      const response = await fetch('/api/auth/me');

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.user;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook pour la connexion
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<User> => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de connexion');
      }

      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user'], user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      router.push('/gallery');
    },
  });
}

// Hook pour l'inscription
export function useSignup() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: SignupCredentials): Promise<User> => {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur d\'inscription');
      }

      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user'], user);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      router.push('/gallery');
    },
  });
}

// Hook pour la déconnexion
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    },
    onSettled: () => {
      queryClient.setQueryData(['user'], null);
      queryClient.clear();
      router.push('/login');
    },
  });
}

// Hook pour vérifier l'authentification
export function useAuth() {
  const { data: user, isLoading, error } = useUser();
  const loginMutation = useLogin();
  const signupMutation = useSignup();
  const logoutMutation = useLogout();

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
