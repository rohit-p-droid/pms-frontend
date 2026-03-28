import { LoginPage } from '../pages/login/LoginPage';
import type { RouteObject } from 'react-router-dom';
import { RegisterPage } from '../pages/register/RegisterPage';

export const authRoutes: RouteObject[] = [
  {
    path: 'login',
    element: <LoginPage />,
  },
  {
    path: 'register',
    element: <RegisterPage />,
  },
]
