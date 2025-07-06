"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, User, LineChartIcon as ChartLine } from "lucide-react"
import Header from "@/components/header"
import Toast from "@/components/toast"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState({ show: false, message: "", type: "success" as "success" | "error" })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullname.trim()) {
      newErrors.fullname = "Por favor ingresa tu nombre completo"
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Por favor ingresa un correo electrónico válido"
    }

    if (formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden"
    }

    if (!formData.terms) {
      newErrors.terms = "Debes aceptar los términos y condiciones"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)) strength++
    if (password.match(/([0-9])/)) strength++
    if (password.match(/([!,%,&,@,#,$,^,*,?,_,~])/)) strength++
    return strength
  }

  const getStrengthColor = (strength: number) => {
    switch (strength) {
      case 1:
        return "bg-red-500"
      case 2:
        return "bg-orange-500"
      case 3:
        return "bg-yellow-500"
      case 4:
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStrengthText = (strength: number) => {
    switch (strength) {
      case 1:
        return "Contraseña débil"
      case 2:
        return "Contraseña moderada"
      case 3:
        return "Contraseña buena"
      case 4:
        return "Contraseña fuerte"
      default:
        return "Contraseña débil"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      console.log('Enviando datos de registro:', { email: formData.email, password: formData.password })
      
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      })
      
      console.log('Respuesta del servidor:', res.status, res.statusText)
      
      const data = await res.json()
      console.log('Datos de respuesta:', data)
      
      if (!res.ok) {
        const errorMessage = data.error || data.details || 'Registro fallido'
        console.error('Error en registro:', errorMessage)
        setToast({ show: true, message: errorMessage, type: 'error' })
        setIsLoading(false)
        return
      }

      setToast({ show: true, message: '¡Cuenta creada! Redirigiendo...', type: 'success' })
      setTimeout(() => {
        router.push('/auth/role-selection')
      }, 1500)
    } catch (error) {
      console.error('Error de red:', error)
      setToast({ show: true, message: 'Error de conexión. Intenta nuevamente.', type: 'error' })
      setIsLoading(false)
    }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-inter">
      <Header />

      <main className="min-h-screen flex items-center justify-center py-16 px-4 pt-20">
        <div className="w-full max-w-md bg-[#1E1E1E] rounded-lg shadow-[0_0_12px_rgba(0,0,0,0.67)] p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6 bg-black bg-opacity-30 p-4 rounded-full">
              <ChartLine className="text-[#39FF14]" size={32} />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Crear Nueva Cuenta</h1>
            <p className="text-gray-400 text-center">Únete a BonoApp para empezar a gestionar o invertir en bonos.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="fullname" className="block text-gray-300 font-medium">
                Nombre Completo
              </label>
              <div className="relative">
                <input
                  id="fullname"
                  type="text"
                  value={formData.fullname}
                  onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                  className={`w-full px-4 py-3 bg-[#0D0D0D] border ${errors.fullname ? "border-red-500" : "border-[#2A2A2A]"} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition duration-250`}
                  placeholder="Juan Pérez"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <User className="text-gray-500" size={16} />
                </div>
              </div>
              {errors.fullname && <p className="text-red-500 text-xs">{errors.fullname}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-gray-300 font-medium">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-3 bg-[#0D0D0D] border ${errors.email ? "border-red-500" : "border-[#2A2A2A]"} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition duration-250`}
                  placeholder="tu_correo@ejemplo.com"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Mail className="text-gray-500" size={16} />
                </div>
              </div>
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-gray-300 font-medium">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-3 bg-[#0D0D0D] border ${errors.password ? "border-red-500" : "border-[#2A2A2A]"} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition duration-250`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition duration-250"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-1">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 w-1/4 rounded-full ${i <= passwordStrength ? getStrengthColor(passwordStrength) : "bg-gray-500"}`}
                      />
                    ))}
                  </div>
                  <p
                    className={`text-xs mt-1 ${passwordStrength <= 1 ? "text-red-500" : passwordStrength <= 2 ? "text-orange-500" : passwordStrength <= 3 ? "text-yellow-500" : "text-green-500"}`}
                  >
                    {getStrengthText(passwordStrength)}
                  </p>
                </div>
              )}
              {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="block text-gray-300 font-medium">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full px-4 py-3 bg-[#0D0D0D] border ${errors.confirmPassword ? "border-red-500" : "border-[#2A2A2A]"} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition duration-250`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition duration-250"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword}</p>}
            </div>

            <div className="flex items-start mt-6">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                  className="w-4 h-4 bg-[#0D0D0D] border border-[#2A2A2A] rounded focus:ring-[#39FF14] text-[#39FF14]"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="text-gray-300">
                  Acepto los{" "}
                  <span className="text-[#39FF14] hover:text-white hover:underline transition duration-250 cursor-pointer">
                    Términos de Servicio
                  </span>{" "}
                  y la{" "}
                  <span className="text-[#39FF14] hover:text-white hover:underline transition duration-250 cursor-pointer">
                    Política de Privacidad
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#39FF14] text-black font-semibold rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250 flex justify-center items-center disabled:opacity-50 mt-6"
            >
              {isLoading ? "Registrando..." : "Registrarme"}
            </button>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-400">
                ¿Ya tienes una cuenta?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="font-medium text-[#39FF14] hover:text-white hover:underline transition duration-250"
                >
                  Inicia Sesión
                </button>
              </p>
            </div>
          </form>
        </div>
      </main>

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, show: false })}
      />
    </div>
  )
}
