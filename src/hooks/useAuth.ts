import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { login, logout } from '../redux/slices/authSlice';

// Compatibility hook - maintains same API as old useAuth
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return {
    isAuthenticated,
    login: () => dispatch(login()),
    logout: () => dispatch(logout()),
  };
};

