import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerSchema, type RegisterPayload } from '../schemas/auth.schema'
import { authService } from '../services'
import { useAppDispatch, useAuthLoading, useAuthError } from '../hooks/useRedux'
import { setAuth, setLoading, setError } from '../store/slices/authSlice'
import { useTheme } from '../hooks/useTheme'
import { Card, CardHeader, CardContent, TextInput, Button } from '../components'
import { MdLightbulb, MdDarkMode, MdBolt } from 'react-icons/md'
import { ZodError } from 'zod'

export function RegisterPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const isLoading = useAuthLoading()
  const error = useAuthError()
  const { resolvedTheme, toggleTheme } = useTheme()

  const [formData, setFormData] = useState<RegisterPayload>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    dispatch(setError(null))

    try {
      const validated = registerSchema.parse(formData)

      dispatch(setLoading(true))
      const response = await authService.register(validated)
      dispatch(setAuth(response))
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string> = {}
        err.issues.forEach((issue) => {
          const field = issue.path[0] as string
          errors[field] = issue.message
        })
        setFieldErrors(errors)
      } else if (err instanceof Error) {
        dispatch(setError(err.message))
      } else {
        dispatch(setError('An unexpected error occurred'))
      }
    } finally {
      dispatch(setLoading(false))
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Theme toggle button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors z-50"
        aria-label="Toggle theme"
      >
        {resolvedTheme === 'dark' ? (
          <MdLightbulb className="w-5 h-5 text-yellow-500" />
        ) : (
          <MdDarkMode className="w-5 h-5 text-slate-700" />
        )}
      </button>

      {/* Main container */}
      <div className="w-full max-w-md">
        <Card>
          {/* Header */}
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <MdBolt className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white text-center mb-2">Developer OS</h1>
            <p className="text-primary-100 text-center text-sm">Your Personal Productivity Hub</p>
          </CardHeader>

          {/* Content */}
          <CardContent>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Create your account</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Join your personal developer ecosystem</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg animate-slide-up">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  label="First name"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  error={fieldErrors.firstName}
                />

                <TextInput
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  label="Last name"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  error={fieldErrors.lastName}
                />
              </div>

              {/* Email field */}
              <TextInput
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                label="Email address"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                error={fieldErrors.email}
              />

              {/* Password field */}
              <TextInput
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                label="Password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                error={fieldErrors.password}
                helperText="At least 8 characters"
              />

              {/* Terms checkbox */}
              <div className="flex items-start">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded dark:bg-slate-700 dark:border-slate-600 dark:checked:bg-primary-600 mt-1"
                  disabled={isLoading}
                  required
                />
                <label htmlFor="terms" className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                  I agree to the{' '}
                  <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
                    Privacy Policy
                  </a>
                </label>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full mt-6"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">Already have an account?</span>
              </div>
            </div>

            {/* Sign in link */}
            <div className="mt-6">
              <Link
                to="/login"
                className="block w-full text-center px-4 py-2.5 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Building your personal productivity platform
          </p>
        </div>
      </div>
    </div>
  )
}
