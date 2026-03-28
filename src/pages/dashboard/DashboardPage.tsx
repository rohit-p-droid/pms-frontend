import { useSelector } from 'react-redux'
import type { RootState } from '../../store/store'

export default function DashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth)

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1200px] mx-auto">
      {/* Content Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200 m-0">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-0">
          Welcome back{user ? `, ${user.firstName}` : ''}
        </p>
      </div>

    </div>
  )
}
