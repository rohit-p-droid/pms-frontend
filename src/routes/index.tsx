import { appRoutes } from './app.routes';
import { authRoutes } from './auth.routes';
import type { RouteObject } from 'react-router-dom';

export const routes: RouteObject[] = [
  ...authRoutes,
  ...appRoutes,
]
