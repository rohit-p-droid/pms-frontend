import { appRoutes } from './app.routes';
import { authRoutes } from './auth.routes';
import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  ...authRoutes,
  ...appRoutes,
]
