import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import AppLayout from '../layouts/AppLayout'
import DashboardPage from '../pages/dashboard/DashboardPage'
import DocumentEditorPage from '../pages/editor/DocumentEditorPage'
import WorkspaceListPage from '../pages/workspace/WorkspaceListPage'
import ComingSoonPage from '../pages/coming-soon/ComingSoonPage'
import PasswordManagerPage from '../pages/password-manager/PasswordManagerPage'
import AccountSettingsPage from '../pages/settings/AccountSettingsPage'

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'workspace',
        children: [
          {
            index: true,
            element: <WorkspaceListPage />,
          },
          {
            path: ':workspaceId',
            element: <DocumentEditorPage />,
          },
        ]
      },
      {
        path: 'cloud-storage',
        element: <ComingSoonPage title="Cloud Storage" />,
      },
      {
        path: 'password-manager',
        element: <PasswordManagerPage />,
      },
      {
        path: 'settings',
        element: <AccountSettingsPage />,
      },
      {
        path: 'connections',
        element: <ComingSoonPage title="Connections" />,
      },
      {
        path: 'other',
        element: <ComingSoonPage title="Other Features" />,
      },
      {
        path: 'app',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]
