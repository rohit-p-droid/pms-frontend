import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../store/store'
import { setWorkspaces, setError } from '../store/slices/docsSlice'
import { listWorkspaces } from '../services/docs.service'
import Sidebar from './Sidebar'
import Header from './Header'

const SIDEBAR_WIDTH = 250

export default function AppLayout() {
  const dispatch = useDispatch<AppDispatch>()
  const { breadcrumb, error } = useSelector((state: RootState) => state.docs)

  // Fetch workspaces once on mount
  useEffect(() => {
    ;(async () => {
      try {
        const workspaces = await listWorkspaces()
        dispatch(setWorkspaces(workspaces))
      } catch {
        dispatch(setError('Failed to load workspaces'))
      }
    })()
  }, [dispatch])

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9] dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col h-full"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <Sidebar />
      </div>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <Header breadcrumb={breadcrumb} />

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-2 px-3 py-2 text-xs border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
