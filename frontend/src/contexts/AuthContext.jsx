import { createContext, useContext, useEffect, useState } from 'react'
import { auth, googleProvider } from '../firebase'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { authApi } from '../api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [adminData, setAdminData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsApproval, setNeedsApproval] = useState(false)

  const isSuperAdmin = adminData?.role === 'super_admin'
  const isAdmin = adminData?.role === 'admin' || adminData?.role === 'super_admin' || adminData?.role === 'hr_manager'
  const isActive = adminData?.is_active !== false

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const res = await authApi.register({
            firebase_uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
          })
          setAdminData(res)
          // Check if new admin needs approval
          if (res.role === 'viewer' && !res.is_active) {
            setNeedsApproval(true)
          }
        } catch (err) {
          console.error('Admin registration error:', err)
          setNeedsApproval(true)
        }
      } else {
        setAdminData(null)
        setNeedsApproval(false)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      toast.success('Welcome back!')
    } catch (err) {
      toast.error('Login failed. Please try again.')
      throw err
    }
  }

  const logout = async () => {
    await signOut(auth)
    toast.success('Signed out successfully')
  }

  const refreshAdminData = async () => {
    if (user) {
      try {
        const res = await authApi.me()
        setAdminData(res)
      } catch (err) {
        console.error('Failed to refresh admin data:', err)
      }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      adminData,
      loading,
      loginWithGoogle,
      logout,
      isSuperAdmin,
      isAdmin,
      isActive,
      needsApproval,
      refreshAdminData
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
