import { useState, useEffect } from 'react'

interface BondDetails {
  id: string
  name: string
  isinCode: string
  issuerName: string
  issuerIndustry: string
  currency: string
  nominalValue: number
  commercialPrice: number
  issueDate: string
  maturityDate: string
  couponRate: number
  paymentFrequency: string
  rateType: string
  inflationIndexed: boolean
  inflationRate: number
  maturityPremium: number
  availableAmount: number
  estimatedTREA: number
  daysPerYear: number
  discountRate: number
  // Campos adicionales para la página de detalle
  status: string
  issuer: string
  interestRate: number
  interestRateType: string
  purchaseDate: string
  initialDisbursement: number
  marketValueToday: number
  unrealizedGain: number
  collectedCoupons: number
  nextCouponDate: string
  nextCouponAmount: number
  duration: number
  convexity: number
  modifiedDuration: number
  trea: number
  costs: {
    placement: number
    flotation: number
    cavali: number
  }
  flows: Array<{
    period: number
    date: string
    annualInflation: number | null
    semesterInflation: number | null
    gracePeriod: string | null
    indexedBond: number | null
    coupon: number | null
    amortization: number | null
    premium: number | null
    investorFlow: number | null
    actualizedFlow: number | null
    faByTerm: number | null
    convexityFactor: number | null
  }>
}

export function useBondDetails(bondId: string) {
  const [bondDetails, setBondDetails] = useState<BondDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBondDetails = async () => {
      if (!bondId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Obtener datos básicos del bono
        const bondResponse = await fetch(`/api/bonds/${bondId}`)
        
        if (!bondResponse.ok) {
          throw new Error(`Error ${bondResponse.status}: ${bondResponse.statusText}`)
        }

        const bondData = await bondResponse.json()
        
        if (!bondData.success || !bondData.bond) {
          throw new Error('Datos de bono inválidos')
        }

        // Obtener flujos reales del inversionista
        const flowsResponse = await fetch(`/api/bonds/${bondId}/flows?role=inversionista&auto_calculate=true`)
        
        let flows = []
        if (flowsResponse.ok) {
          const flowsData = await flowsResponse.json()
          if (flowsData.success && flowsData.flows) {
            flows = flowsData.flows.map((flow: any) => ({
              period: flow.periodo,
              date: flow.fecha,
              annualInflation: flow.inflacionAnual,
              semesterInflation: flow.inflacionSemestral,
              gracePeriod: flow.periodoGracia,
              indexedBond: flow.bonoIndexado,
              coupon: flow.cupon,
              amortization: flow.amortizacion,
              premium: flow.prima,
              investorFlow: flow.flujoBonista,
              actualizedFlow: flow.flujoActualizado,
              faByTerm: flow.faPorPlazo,
              convexityFactor: flow.factorConvexidad
            }))
          }
        }

        // Si no hay flujos, crear flujos básicos
        if (flows.length === 0) {
          flows = [
            {
              period: 0,
              date: bondData.bond.fechaEmision.split('T')[0],
              annualInflation: null,
              semesterInflation: null,
              gracePeriod: null,
              indexedBond: null,
              coupon: null,
              amortization: null,
              premium: null,
              investorFlow: -bondData.bond.valorComercial,
              actualizedFlow: null,
              faByTerm: null,
              convexityFactor: null
            }
          ]
        }

        // Mapear los datos del endpoint al formato esperado
        const mappedBond: BondDetails = {
          id: bondData.bond.id,
          name: bondData.bond.name,
          isinCode: bondData.bond.codigoIsin,
          issuerName: bondData.bond.emisor?.companyName || 'No especificado',
          issuerIndustry: 'No especificado', // No está en el endpoint
          currency: bondData.bond.currency || 'USD', // Asumir USD si no está especificado
          nominalValue: bondData.bond.valorNominal,
          commercialPrice: bondData.bond.valorComercial,
          issueDate: bondData.bond.fechaEmision.split('T')[0],
          maturityDate: bondData.bond.fechaVencimiento.split('T')[0],
          couponRate: bondData.bond.tasaAnual,
          paymentFrequency: bondData.bond.frecuenciaCupon,
          rateType: bondData.bond.tipoTasa,
          inflationIndexed: bondData.bond.indexadoInflacion,
          inflationRate: bondData.bond.inflacionAnual || 0,
          maturityPremium: bondData.bond.primaVencimiento,
          availableAmount: bondData.bond.valorNominal, // Asumiendo que todo está disponible
          estimatedTREA: bondData.bond.financialMetrics?.tcea || 0,
          daysPerYear: bondData.bond.baseDias,
          discountRate: bondData.bond.tasaDescuento || 0.08,
          // Campos adicionales para la página de detalle
          status: bondData.bond.status,
          issuer: bondData.bond.emisor?.companyName || 'No especificado',
          interestRate: bondData.bond.tasaAnual,
          interestRateType: bondData.bond.tipoTasa,
          purchaseDate: bondData.bond.fechaEmision.split('T')[0], // Usar fecha de emisión como fecha de compra
          initialDisbursement: bondData.bond.valorComercial, // Usar valor comercial como desembolso inicial
          marketValueToday: bondData.bond.valorComercial, // Usar valor comercial como valor actual
          unrealizedGain: 0, // Por defecto 0
          collectedCoupons: 0, // Por defecto 0
          nextCouponDate: bondData.bond.fechaEmision.split('T')[0], // Usar fecha de emisión como próximo cupón
          nextCouponAmount: (bondData.bond.valorNominal * bondData.bond.tasaAnual) / 100, // Calcular cupón
          duration: bondData.bond.financialMetrics?.duracion || 0,
          convexity: bondData.bond.financialMetrics?.convexidad || 0,
          modifiedDuration: bondData.bond.financialMetrics?.duracionModificada || 0,
          trea: bondData.bond.financialMetrics?.tcea || 0,
          costs: {
            placement: (bondData.bond.costs?.colocacionPorcentaje || 0) * bondData.bond.valorNominal,
            flotation: (bondData.bond.costs?.flotacionPorcentaje || 0) * bondData.bond.valorNominal,
            cavali: (bondData.bond.costs?.cavaliPorcentaje || 0) * bondData.bond.valorNominal
          },
          flows: flows
        }
        setBondDetails(mappedBond)
      } catch (err) {
        console.error('Error fetching bond details:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchBondDetails()
  }, [bondId])

  return { bondDetails, loading, error }
} 