import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import type { RootState, AppDispatch } from '../store/store'
import type { BreadcrumbItem } from '../store/slices/docsSlice'
import { logout } from '../store/slices/authSlice'
import { closeDocument } from '../store/slices/docsSlice'
import { useTheme } from '../hooks/useTheme'
import { LogOut, Sun, Moon, User, Settings, ChevronRight } from 'lucide-react'

interface Props {
  breadcrumb: BreadcrumbItem[]
}

export default function Header({ breadcrumb }: Props) {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()

  const { user } = useSelector((state: RootState) => state.auth)
  const { resolvedTheme, toggleTheme } = useTheme()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    dispatch(closeDocument())
    navigate('/login', { replace: true })
  }

  // Determine what to display in the breadcrumb dynamically based on the route
  let crumbs = [{ label: 'Your Workspaces' }]
  const isWorkspaceList = location.pathname === '/workspace'
  
  if (location.pathname.startsWith('/dashboard')) crumbs = [{ label: 'Dashboard' }]
  else if (location.pathname.startsWith('/cloud-storage')) crumbs = [{ label: 'Cloud Storage' }]
  else if (location.pathname.startsWith('/password-manager')) crumbs = [{ label: 'Password Manager' }]
  else if (location.pathname.startsWith('/settings')) crumbs = [{ label: 'Account Settings' }]
  else if (location.pathname.startsWith('/connections')) crumbs = [{ label: 'Connections' }]
  else if (location.pathname.startsWith('/other')) crumbs = [{ label: 'Other Features' }]
  else if (!isWorkspaceList && breadcrumb.length > 0) crumbs = breadcrumb
  else if (!isWorkspaceList) crumbs = [{ label: 'Workspace Overview' }]

  return (
    <header className="h-[56px] flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#343a40] shrink-0 shadow-sm z-10 relative">
      <div className="flex items-center gap-4 pl-1">

        {/* Breadcrumbs */}
        <nav
          id="breadcrumb-nav"
          className="flex items-center text-sm md:text-base overflow-hidden"
          aria-label="Breadcrumb"
        >
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return (
            <span key={idx} className="flex items-center min-w-0">
              {idx > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 mx-2 shrink-0" />
              )}
              <span
                className={`truncate transition-colors ${
                  isLast
                    ? 'text-gray-900 dark:text-gray-100 font-semibold'
                    : 'text-secondary-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {crumb.label}
              </span>
            </span>
          )
        })}

      </nav>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0" ref={profileRef}>
        {user ? (
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 pr-2 rounded-full transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-[#007bff] flex items-center justify-center text-white shrink-0 shadow-sm">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                {user.firstName}
              </span>
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 dark:bg-[#252b30]/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-2xl rounded-xl py-2 z-50 flex flex-col transform origin-top-right transition-all animate-in zoom-in-95 duration-150">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/60 mb-1">
                  <p className="text-[15px] font-bold text-gray-800 dark:text-white truncate tracking-tight">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 truncate mt-0.5 font-medium">
                    {user.email}
                  </p>
                </div>

                <button
                  className="flex items-center gap-3 text-sm font-medium text-left px-5 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setIsProfileOpen(false)
                    navigate('/settings')
                  }}
                >
                  <Settings className="w-4 h-4 text-gray-400 dark:text-gray-400" />
                  Account Settings
                </button>
                
                <button
                  className="flex items-center gap-3 text-sm font-medium text-left px-5 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  onClick={() => {
                    toggleTheme()
                    setIsProfileOpen(false)
                  }}
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                  {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>

                <div className="h-px bg-gray-100 dark:bg-gray-800/60 my-1"></div>

                <button
                  className="flex items-center gap-3 text-sm font-medium text-left px-5 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  onClick={() => {
                    setIsProfileOpen(false)
                    handleLogout()
                  }}
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  )
}
