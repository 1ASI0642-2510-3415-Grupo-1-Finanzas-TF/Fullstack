"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const userRole = localStorage.getItem("userRole")
    const token = document.cookie.includes('token=')
    
    if (userRole && token) {
      router.push(userRole === "emisor" ? "/emisor/dashboard" : "/inversionista/dashboard")
    } else {
      // Limpiar datos obsoletos
      localStorage.removeItem("userRole")
      router.push("/auth/login")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14] mx-auto"></div>
        <p className="text-white mt-4">Cargando...</p>
      </div>
    </div>
  )
}
