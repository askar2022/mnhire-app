import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { NavbarClient } from './NavbarClient'

export async function Navbar() {
  let authUser = null
  let userData = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    authUser = user

    if (authUser) {
      const { data } = await supabase
        .from('users')
        .select('name, email, role')
        .eq('id', authUser.id)
        .single()
      userData = data ?? {
        name: authUser.email ?? '',
        email: authUser.email ?? '',
        role: 'applicant',
      }
    }
  } catch {
    // Supabase not configured or unavailable — render navbar without auth state
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">

          {/* Left side: logo + nav links */}
          <div className="flex">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/mnhire-logo.png"
                alt="MNHire Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </Link>
            <NavbarClient user={userData} section="links" />
          </div>

          {/* Right side: user menu */}
          <NavbarClient user={userData} section="user" />

        </div>
      </div>
    </nav>
  )
}
