import { useAuth } from '../contexts/AuthContext'
import { Building2, Shield, Users, BarChart3 } from 'lucide-react'

export default function LoginPage() {
  const { loginWithGoogle } = useAuth()

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink-900/60 border-r border-ink-700/40 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-jade/8 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
              <Building2 size={20} className="text-accent-light" />
            </div>
            <span className="font-display text-xl font-semibold text-ink-100">HRMS</span>
          </div>

          <h1 className="font-display text-4xl font-bold text-ink-50 leading-tight mb-6">
            Manage your<br />
            <span className="text-accent-light">workforce</span><br />
            with clarity.
          </h1>
          <p className="text-ink-400 text-base leading-relaxed max-w-sm">
            A modern HR platform to track employees, manage attendance, and gain real-time insights — all in one place.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            { icon: Users, label: 'Employee Management', desc: 'Full employee lifecycle tracking' },
            { icon: BarChart3, label: 'Attendance Analytics', desc: 'Daily check-ins, reports & trends' },
            { icon: Shield, label: 'Secure Access', desc: 'Firebase-powered authentication' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4 p-3 rounded-xl bg-ink-800/40 border border-ink-700/30">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-accent-light" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-200">{label}</p>
                <p className="text-xs text-ink-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
              <Building2 size={20} className="text-accent-light" />
            </div>
            <span className="font-display text-xl font-semibold text-ink-100">HRMS</span>
          </div>

          <div className="card p-8">
            <h2 className="font-display text-2xl font-bold text-ink-50 mb-2">Sign in</h2>
            <p className="text-ink-400 text-sm mb-8">Access the admin portal to manage your team.</p>

            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-medium py-3 px-4 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-black/20"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.14L4.5 10.48z"/>
                <path fill="#EA4335" d="M8.98 3.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.43L4.5 7.5A4.77 4.77 0 0 1 8.98 3.18z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-xs text-ink-600 mt-6">
              Only authorized administrators can access this portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
