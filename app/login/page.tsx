'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import * as Tabs from '@radix-ui/react-tabs'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const router = useRouter()
  const supabase = createClient()

  // Middleware handles redirecting already-logged-in users away from /login

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
      // Google will redirect automatically, so no need to handle success here
    } catch (err: any) {
      setError(err.message || 'An error occurred with Google sign-in')
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      // Get user role from database
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user?.id)
        .single()

      // Determine redirect URL based on returnUrl or user role
      const params = new URLSearchParams(window.location.search)
      const returnUrl = params.get('returnUrl')
      
      if (returnUrl) {
        router.push(returnUrl)
      } else {
        // Redirect based on role
        const isAdmin = ['HR', 'Admin', 'Principal', 'HiringManager',
          'AcademicDirector', 'SPEDDirector', 'OperationManager', 'AssistantPrincipal', 'ITSupport', 'ExecutiveDirector'].includes(userData?.role)
        router.push(isAdmin ? '/admin' : '/my-applications')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            }
          }
        })

        if (authError) throw authError

        // The trigger will automatically create the user record
        // But we'll also manually create it to ensure it exists immediately
        if (authData.user) {
          const { error: userError } = await supabase.from('users').insert({
            id: authData.user.id,
            name,
            email,
            role: 'Applicant',
          })

          // Ignore duplicate key errors (trigger might have created it already)
          if (userError && !userError.message.includes('duplicate')) {
            throw userError
          }
        }

      // After signup, redirect based on returnUrl or show success message
      const params = new URLSearchParams(window.location.search)
      const returnUrl = params.get('returnUrl')
      if (returnUrl) {
        router.push(returnUrl)
      } else {
        alert('Account created! Please check your email to verify your account.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900"></div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* MNHire Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-3">
              <Image 
                src="/mnhire-logo.png" 
                alt="MNHire Logo" 
                width={56} 
                height={56}
                className="object-contain"
              />
              <span className="text-2xl font-bold text-gray-900">MNHire</span>
            </div>
          </div>

          {/* Simple instruction */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              Sign in with Google or create an account to apply
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Google Sign-In Button */}
          <div className="mb-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                {loading ? 'Signing in...' : 'Continue with Google'}
              </span>
            </button>
            
            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-400">Or sign in with email & password</span>
              </div>
            </div>
          </div>

          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
            <Tabs.List className="flex w-full mb-6 bg-gray-100 rounded-lg p-1">
              <Tabs.Trigger
                value="login"
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              >
                Sign In
              </Tabs.Trigger>
              <Tabs.Trigger
                value="signup"
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900"
              >
                Sign Up
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="login" className="focus:outline-none">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email) {
                          setError('Please enter your email address first')
                          return
                        }
                        try {
                          const { error } = await supabase.auth.resetPasswordForEmail(email, {
                            redirectTo: `${window.location.origin}/auth/update-password`,
                          })
                          if (error) throw error
                          alert('Password reset email sent! Check your inbox.')
                        } catch (err: any) {
                          setError(err.message)
                        }
                      }}
                      className="text-sm text-primary-600 hover:text-primary-500"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </Tabs.Content>

            <Tabs.Content value="signup" className="focus:outline-none">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </div>
    </div>
  )
}

