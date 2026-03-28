import { useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginSchema, type LoginPayload } from '../../schemas/auth.schema'
import { authService } from '../../services'
import { useAppDispatch, useAuthLoading, useAuthError } from '../../hooks/useRedux'
import { setAuth, setLoading, setError } from '../../store/slices/authSlice'
import { useTheme } from '../../hooks/useTheme'
import { Card, CardHeader, CardContent, TextInput, Button } from '../../components'
import { MdLightbulb, MdDarkMode, MdBolt } from 'react-icons/md'
import { ZodError } from 'zod'

export function LoginPage() {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const isLoading = useAuthLoading()
    const error = useAuthError()
    const { resolvedTheme, toggleTheme } = useTheme()

    const [formData, setFormData] = useState<LoginPayload>({
        email: '',
        password: '',
    })
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        // Clear field error when user starts typing
        setFieldErrors((prev) => {
            if (prev[name]) {
                const next = { ...prev }
                delete next[name]
                return next
            }
            return prev
        })
    }, [])

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        setFieldErrors({})
        dispatch(setError(null))

        try {
            // Validate form
            const validated = loginSchema.parse(formData)

            dispatch(setLoading(true))
            const response = await authService.login(validated)

            dispatch(setAuth(response))
            navigate('/app')
        } catch (err: any) {
            if (err instanceof ZodError) {
                const errors: Record<string, string> = {}
                err.issues.forEach((issue) => {
                    const field = issue.path[0] as string
                    errors[field] = issue.message
                })
                setFieldErrors(errors)
            } else if (err?.response?.status === 401 || err?.status === 401 || err?.message?.toLowerCase().includes('401') || err?.message?.toLowerCase().includes('credential') || err?.message?.toLowerCase().includes('unauthorized')) {
                dispatch(setError('Invalid email or password'))
            } else if (err instanceof Error) {
                dispatch(setError(err.message))
            } else {
                dispatch(setError('An unexpected error occurred'))
            }
        } finally {
            dispatch(setLoading(false))
        }
    }, [formData, dispatch, navigate])

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
            <div className="w-full max-w-2xl animate-fade-in">
                <Card className="shadow-2xl border-0 overflow-hidden">
                    {/* Header */}
                    <CardHeader className="bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 pt-6 pb-6">
                        <div className="flex justify-center mb-2">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg hover:shadow-xl transition-shadow">
                                <MdBolt className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white text-center tracking-tight mb-0.5">Developer OS</h1>
                        <p className="text-primary-100/90 text-center text-xs font-medium">Your Personal Productivity Hub</p>
                    </CardHeader>

                    {/* Content */}
                    <CardContent className="pt-6 px-8 pb-6 bg-white dark:bg-slate-800">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">Sign in to your account to continue</p>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg animate-slide-up">
                                <p className="text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-3">
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
                            <div>
                                <div className="mb-2">
                                    <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Password
                                    </label>
                                </div>
                                <TextInput
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                    error={fieldErrors.password}
                                />
                            </div>



                            {/* Submit button */}
                            <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                isLoading={isLoading}
                                className="w-full"
                            >
                                {isLoading ? 'Signing in...' : 'Sign in'}
                            </Button>
                        </form>


                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        By signing in, you agree to our{' '}
                        <Link to="/terms" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline font-medium transition-colors">
                            Terms of Service
                        </Link>
                        {' '}and{' '}
                        <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline font-medium transition-colors">
                            Privacy Policy
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
