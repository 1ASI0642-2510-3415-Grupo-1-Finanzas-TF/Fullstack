"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from '@/lib/hooks/useAuth'
import { useBondDetails } from '@/lib/hooks/useBondDetails'
import { useInvestInBond } from '@/lib/hooks/useInvestInBond'
import {
  LineChartIcon as ChartLine,
  ArrowLeft,
  Calculator,
  Check,
  CheckCircle,
  Info,
  Bell,
  UserCircle,
  ArrowRight,
  Loader2,
} from "lucide-react"

interface InvestmentCosts {
  flotation: number
  cavali: number
  total: number
}

interface FlowProjection {
  period: number
  date: string
  gracePeriod: string | null
  indexedBond: number
  coupon: number
  premium: number
  amortization: number
  investorFlow: number | null;
}

interface KPIs {
  estimatedTREA: number
  duration: number
  convexity: number
  estimatedVAN: number
}

export default function InvestBondWizard() {
  const router = useRouter()
  const params = useParams()
  const bondId = params.bondId as string
  const { user } = useAuth({ requireRole: 'INVERSIONISTA' })

  const [currentStep, setCurrentStep] = useState(1)
  const [inversionistaData, setInversionistaData] = useState<any>(null)
  const [flowsCalculated, setFlowsCalculated] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  // Hooks para datos reales
  const { bondDetails, loading: bondLoading, error: bondError } = useBondDetails(bondId)
  const { investInBond, loading: investLoading, error: investError } = useInvestInBond()

  // Debug: Log bond details
  useEffect(() => {
    if (bondDetails) {
      console.log('Bond Details loaded:', bondDetails)
    }
  }, [bondDetails])

  // Datos calculados basados en el bono real
  const flotation = bondDetails?.commercialPrice ? (bondDetails.costs?.flotation || 0) : 0;
  const cavali = bondDetails?.commercialPrice ? (bondDetails.costs?.cavali || 0) : 0;

  const investmentCosts: InvestmentCosts = {
    flotation,
    cavali,
    total: flotation + cavali,
  };

  const totalDisbursement = bondDetails && bondDetails.commercialPrice ? (bondDetails.commercialPrice + investmentCosts.total) : 0

  const kpis: KPIs = {
    estimatedTREA: bondDetails?.estimatedTREA || 0,
    duration: bondDetails?.duration || 0,
    convexity: bondDetails?.convexity || 0,
    estimatedVAN: bondDetails && bondDetails.nominalValue ? (bondDetails.nominalValue * 1.12467) : 0,
  }

  // ... Función para formatear fechas
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "N/A"
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  // Flujo de caja proyectado
  const flowProjections: FlowProjection[] = bondDetails ? [
    // Período 0 - inicial
    {
      period: 0,
      date: formatDate(bondDetails.issueDate),
      gracePeriod: bondDetails.flows[0].gracePeriod,
      indexedBond: 0,
      coupon: 0,
      premium: 0,
      amortization: 0,
      investorFlow: -(bondDetails.commercialPrice + investmentCosts.total)
    },
    // Períodos dinámicos basados en bondDetails.flows
    ...bondDetails.flows.slice(1).map((flow, index) => {
      const period = index + 1;
      const isLastPeriod = period === bondDetails.flows.length - 1;

      return {
        period,
        date: formatDate(isLastPeriod ? bondDetails.maturityDate : flow.date),
        gracePeriod: period === 1
            ? (flow.investorFlow === undefined ? 'T' : flow.gracePeriod)
            : period === 2
                ? (bondDetails.flows[1].investorFlow === undefined && flow.investorFlow !== undefined ? 'P' : bondDetails.flows[1].gracePeriod)
                : flow.gracePeriod,
        indexedBond: period === 1
            ? bondDetails.nominalValue
            : bondDetails.nominalValue + bondDetails.nominalValue * bondDetails.couponRate,
        coupon: period === 1
            ? (bondDetails.nominalValue * bondDetails.couponRate)
            : (bondDetails.nominalValue + (bondDetails.nominalValue * bondDetails.couponRate)) * bondDetails.couponRate,
        premium: flow.premium ?? 0,
        amortization: 0,
        investorFlow: flow.investorFlow ?? 0
      };
    })
  ] : [];

  useEffect(() => {
    if (user?.inversionistaProfile) {
      setInversionistaData(user.inversionistaProfile)
    }
  }, [user])

  const handleCalculateFlows = () => {
    setIsCalculating(true)

    setTimeout(() => {
      setFlowsCalculated(true)
      setIsCalculating(false)

      // Scroll to flows section
      const flowsSection = document.getElementById("cash-flow-projection")
      if (flowsSection) {
        flowsSection.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }, 1500)
  }

  const handleContinueToConfirmation = () => {
    setCurrentStep(2)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleConfirmPurchase = async () => {
    if (!bondDetails) return

    setIsProcessing(true)

    try {
      const result = await investInBond({
        bondId: bondDetails.id,
        amount: bondDetails.nominalValue,
        price: bondDetails.commercialPrice
      })

      if (result.success) {
        setShowSuccessToast(true)

        setTimeout(() => {
          setShowSuccessToast(false)
          router.push("/inversionista/dashboard")
        }, 3000)
      } else {
        // Manejar error
        console.error('Error en la inversión:', result.message)
      }
    } catch (error) {
      console.error('Error en la inversión:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === undefined || amount === null) {
      return 'S/ 0.00'
    }
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount)
  }

  // Loading state
  if (bondLoading || !inversionistaData) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14] mx-auto"></div>
          <p className="text-white mt-4">Cargando información de inversión...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (bondError || !bondDetails) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mb-4 mx-auto flex items-center justify-center">
            <Info className="text-red-500" size={64} />
          </div>
          <h2 className="text-xl font-semibold mb-2">Error al cargar el bono</h2>
          <p className="text-gray-400 mb-6">{bondError || 'No se pudo cargar la información del bono'}</p>
          <button
            onClick={() => router.push("/inversionista/dashboard")}
            className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-inter">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full bg-black bg-opacity-75 backdrop-blur-md z-50 py-4">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center">
            <ChartLine className="text-[#39FF14] text-2xl mr-2" size={24} />
            <span className="text-white text-xl font-semibold">BonoApp</span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-white transition">
              <Bell size={20} />
            </button>
            <button className="text-gray-400 hover:text-white transition flex items-center">
              <UserCircle size={20} className="mr-1" />
              {inversionistaData?.name || 'Usuario'}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-24 pb-8">
        <div className="bg-[#151515] rounded-xl w-full max-w-[1200px] mx-auto overflow-hidden">
          {/* Wizard Header */}
          <div className="p-6 flex items-center justify-between">
            <button
              onClick={() => (currentStep === 1 ? router.push("/inversionista/dashboard") : setCurrentStep(1))}
              className="text-gray-400 hover:text-white transition flex items-center"
            >
              <ArrowLeft className="mr-2" size={16} />
              {currentStep === 1 ? "Cancelar" : "Volver a Revisión de Flujos"}
            </button>
            <h1 className="text-xl font-bold text-center">
              {currentStep === 1 ? "Revisar y Comprar: " : "Confirmar Compra: "}
              {bondDetails.name}
            </h1>
            <div className="w-24"></div>
          </div>

          {/* Progress Section */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-400">
                Paso {currentStep} de 2{currentStep === 2 ? ": Confirmar Compra" : ""}
              </div>
            </div>
            <div className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className={`h-full bg-[#39FF14] transition-all duration-500 ${currentStep === 1 ? "w-1/2" : "w-full"}`}
              ></div>
            </div>

            {currentStep === 2 && (
              <div className="flex items-center justify-between mt-2 text-sm">
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-[#39FF14] flex items-center justify-center text-black font-medium">
                    <Check size={12} />
                  </div>
                  <span className="ml-2 text-white">Revisión</span>
                </div>
                <div className="flex-1 mx-4 border-t border-dashed border-[#39FF14]"></div>
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-[#39FF14] flex items-center justify-center text-black font-medium">
                    2
                  </div>
                  <span className="ml-2 text-white">Confirmación</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 1: Bond Review */}
          {currentStep === 1 && (
            <>
              {/* Bond Details Section */}
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Bond Information */}
                  <div className="lg:col-span-2 bg-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4">Información del Bono</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Nombre del Bono / Código ISIN</span>
                        <span className="font-medium">
                          {bondDetails.name} / {bondDetails.isinCode}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Emisor </span>
                        <span className="font-medium">
                          {bondDetails.issuerName}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Valor Nominal (unidad)</span>
                        <span className="font-medium">{formatCurrency(bondDetails.nominalValue)}</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Fecha Emisión / Fecha Vencimiento</span>
                        <span className="font-medium">
                          {bondDetails.issueDate} / {bondDetails.maturityDate}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Tasa Cupón / Frecuencia de Pago</span>
                        <span className="font-medium">
                          {bondDetails.couponRate}% / {bondDetails.paymentFrequency}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Tipo de Tasa / Indexado a Inflación</span>
                        <span className="font-medium">
                          {bondDetails.rateType} /{" "}
                          {bondDetails.inflationIndexed ? `Sí (${bondDetails.inflationRate}%)` : "No"}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Prima al Vencimiento</span>
                        <span className="font-medium">{bondDetails.maturityPremium}%</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Días por Año</span>
                        <span className="font-medium">{bondDetails.daysPerYear}</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[#AAAAAA] text-sm">Tasa de Descuento</span>
                        <span className="font-medium">{bondDetails.discountRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Investment Card */}
                  <div className="bg-[#1E1E1E] rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4">Su Inversión</h2>

                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[#AAAAAA]">Precio Comercial Unitario:</span>
                        <span className="font-medium">{formatCurrency(bondDetails.commercialPrice)}</span>
                      </div>

                      <div className="border-t border-[#2A2A2A] pt-4 mt-4">
                        <h3 className="text-sm font-medium mb-3">Costes de Transacción Estimados:</h3>

                        <div className="flex justify-between items-center mb-2 pl-1">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-[#AAAAAA] rounded-full mr-2"></div>
                            <span className="text-[#AAAAAA]">Flotación (0.75%)</span>
                          </div>
                          <span className="font-medium">{formatCurrency(investmentCosts.flotation)}</span>
                        </div>

                        <div className="flex justify-between items-center mb-2 pl-1">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-[#AAAAAA] rounded-full mr-2"></div>
                            <span className="text-[#AAAAAA]">CAVALI (0.21%)</span>
                          </div>
                          <span className="font-medium">{formatCurrency(investmentCosts.cavali)}</span>
                        </div>

                        <div className="flex justify-between items-center mb-2 pl-1">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-[#AAAAAA] rounded-full mr-2"></div>
                            <span className="text-[#AAAAAA]">Total Costes</span>
                          </div>
                          <span className="font-medium">{formatCurrency(investmentCosts.total)}</span>
                        </div>
                      </div>

                      <div className="border-t border-[#2A2A2A] pt-4 mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[#AAAAAA]">Desembolso Total por Unidad:</span>
                          <span className="font-medium text-[#39FF14]">{formatCurrency(totalDisbursement)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="bg-[#39FF14] bg-opacity-10 border border-[#39FF14] rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-2 text-[#39FF14]">Compra de Bono Completo</h3>
                        <p className="text-sm text-[#AAAAAA]">
                          Estás comprando 1 bono completo por {formatCurrency(bondDetails.commercialPrice)}. 
                          Los bonos no se pueden fraccionar.
                        </p>
                        <div className="mt-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#AAAAAA]">Valor Nominal:</span>
                            <span className="font-medium">{formatCurrency(bondDetails.nominalValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#AAAAAA]">Total a pagar:</span>
                            <span className="font-bold text-[#39FF14]">{formatCurrency(totalDisbursement)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-3">KPIs Estimados:</h3>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[#AAAAAA] text-sm">TREA Estimada:</span>
                          <span className="font-medium text-[#39FF14]">{kpis.estimatedTREA}%</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[#AAAAAA] text-sm">Duración:</span>
                          <span className="font-medium">{kpis.duration} años</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[#AAAAAA] text-sm">Convexidad:</span>
                          <span className="font-medium">{kpis.convexity}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 pb-6">
                <div className="flex justify-between items-center">
                  <button
                    onClick={handleCalculateFlows}
                    disabled={isCalculating}
                    className="bg-[#39FF14] text-black font-bold px-6 py-3 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={16} />
                        Calculando...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2" size={16} />
                        Calcular Flujos de Caja
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleContinueToConfirmation}
                    disabled={!flowsCalculated}
                    className="bg-[#39FF14] text-black font-bold px-6 py-3 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    Continuar a Confirmación
                    <ArrowRight className="ml-2" size={16} />
                  </button>
                </div>
              </div>

              {/* Cash Flow Projection */}
              {flowsCalculated && (
                <div id="cash-flow-projection" className="px-6 pb-6">
                  <div className="bg-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-4">Proyección de Flujos de Caja</h2>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1000px]">
                        <thead>
                          <tr className="border-b border-[#2A2A2A]">
                            <th className="px-2 py-2 text-left text-sm font-medium text-gray-400">Período</th>
                            <th className="px-2 py-2 text-left text-sm font-medium text-gray-400">Fecha</th>
                            <th className="px-2 py-2 text-left text-sm font-medium text-gray-400">Flujo Inversionista</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flowProjections.map((flow) => (
                            <tr key={flow.period} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A]">
                              <td className="px-2 py-2 text-sm">{flow.period}</td>
                              <td className="px-2 py-2 text-sm">{flow.date}</td>
                              <td className="px-2 py-2 text-sm">{formatCurrency(flow.investorFlow?? 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Confirmation */}
          {currentStep === 2 && (
            <div className="px-6 pb-6">
              <div className="bg-[#1E1E1E] rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6">Confirmar Compra</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Resumen de la Inversión</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[#AAAAAA]">Bono:</span>
                        <span className="font-medium">{bondDetails.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#AAAAAA]">Cantidad:</span>
                        <span className="font-medium">1 unidad</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#AAAAAA]">Precio por unidad:</span>
                        <span className="font-medium">{formatCurrency(bondDetails.commercialPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#AAAAAA]">Costes de transacción:</span>
                        <span className="font-medium">{formatCurrency(investmentCosts.total)}</span>
                      </div>
                      <div className="border-t border-[#2A2A2A] pt-3">
                        <div className="flex justify-between">
                          <span className="text-[#AAAAAA] font-medium">Total a pagar:</span>
                          <span className="font-bold text-[#39FF14] text-lg">
                            {formatCurrency(totalDisbursement)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Información del Inversionista</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[#AAAAAA]">Nombre:</span>
                        <span className="font-medium">
                          {inversionistaData?.firstName} {inversionistaData?.lastName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#AAAAAA]">Email:</span>
                        <span className="font-medium">{user?.email || 'No disponible'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#AAAAAA]">RUC:</span>
                        <span className="font-medium">{inversionistaData?.ruc || 'No disponible'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#2A2A2A] pt-6">
                  <div className="flex items-start space-x-3 mb-6">
                    <input
                      type="checkbox"
                      id="confirmation"
                      checked={confirmationChecked}
                      onChange={(e) => setConfirmationChecked(e.target.checked)}
                      className="mt-1"
                    />
                    <label htmlFor="confirmation" className="text-sm">
                      Confirmo que he leído y acepto los términos y condiciones de la inversión. 
                      Entiendo que esta es una inversión de riesgo y que los rendimientos no están garantizados.
                    </label>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="bg-gray-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-gray-700 transition duration-250"
                    >
                      Volver a Revisión
                    </button>

                    <button
                      onClick={handleConfirmPurchase}
                      disabled={!confirmationChecked || isProcessing}
                      className="bg-[#39FF14] text-black font-bold px-6 py-3 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 animate-spin" size={16} />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2" size={16} />
                          Confirmar Compra
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center">
          <CheckCircle className="mr-2" size={20} />
          <span>¡Inversión realizada exitosamente!</span>
        </div>
      )}
    </div>
  )
}
