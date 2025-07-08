// app/emisor/create-bond/components/Step4Dynamic.tsx - CORRECCIÓN COMPLETA
'use client';

import { useState } from 'react';
import { ChevronDown, Calculator, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useCalculations } from '@/lib/hooks/useCalculations';
import { useCashFlows } from '@/lib/hooks/useCashFlows';
import type { EmisorCashFlow } from '@/lib/hooks/useCashFlows';

interface BondData {
    step1?: {
        name?: string;
        nombreInterno?: string;
        codigoIsin?: string;
        valorNominal?: string;
        valorComercial?: string;
        numAnios?: string;
        fechaEmision?: string;
        frecuenciaCupon?: string;
        diasPorAno?: string;
    };
    step2?: {
        tipoTasa?: string;
        periodicidadCapitalizacion?: string;
        tasaAnual?: string;
        tasaDescuento?: string;
        indexadoInflacion?: boolean;
        inflacionAnual?: string;
        primaVencimiento?: string;
        impuestoRenta?: string;
        numGracePeriods?: number;
        gracePeriodsConfig?: Array<{
            couponNumber: number;
            graceType: 'T' | 'P' | 'S';
        }>;
    };
    step3?: {
        estructuracionEmisor?: string;
        colocacionEmisor?: string;
        flotacionEmisor?: string;
        cavaliEmisor?: string;
        emisorTotalAbs?: string;
        bonistaTotalAbs?: string;
        totalCostsAbs?: string;
        flotacionBonista?: string;
        cavaliBonista?: string;
    };
}

interface Step4Props {
    bondData: BondData;
    bondId?: string | null; // ID del bono creado
}

export default function Step4Dynamic({ bondData, bondId }: Step4Props) {
    const [confirmationChecked, setConfirmationChecked] = useState(false);
    const [activeTab, setActiveTab] = useState("summary");
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        datos: true,
        condiciones: false,
        costes: false,
    });

    const {
        calculate,
        isCalculating,
        lastResult,
        hasFlows,
        canCalculate,
        status,
        calculationError
    } = useCalculations(bondId ?? undefined, {
        autoCalculate: true, // Auto-calcular si el bono ya existe
        onSuccess: (result) => console.log('✅ Cálculos en Step4 completados:', result),
        onError: (error) => console.error('❌ Error en cálculos de Step4:', error)
    });

    const {
        flows,
        downloadCSV,
        hasFlows: hasFlowsData,
        error: flowsError
    } = useCashFlows(bondId ?? undefined, {
        role: 'emisor',
        autoCalculate: true // Auto-calcular flujos si el bono ya existe
    });

    // ✅ CORRECCIÓN CRÍTICA: Solo usar datos de la base de datos para cálculos automáticos
    const handleCalculateFlows = async () => {
        if (!bondId || !canCalculate) {
            console.warn('No se puede calcular: bondId no existe o canCalculate es falso');
            return;
        }

        try {
            console.log('🔄 Iniciando cálculo usando datos de la base de datos...');

            // ✅ NO construir inputs manualmente - dejar que el sistema use los datos de la BD
            await calculate({
                recalculate: true,
                saveResults: true,
                // ❌ NO ENVIAR 'inputs' - esto causaba el bucle
                // inputs: calculationInputs
            });

        } catch (error) {
            console.error('❌ Error ejecutando cálculos:', error);
        }
    };

    // ✅ MANTENER buildCalculationInputs solo para validación/debug (NO para cálculos)
    const buildCalculationInputsForValidation = () => {
        try {
            const numAnios = parseInt(bondData.step1?.numAnios || '0');
            if (numAnios <= 0) throw new Error("Número de años no válido");

            const frecuencia = bondData.step1?.frecuenciaCupon || 'semestral';

            // Calcular dinámicamente los cupones por año
            const couponsPerYearMap: { [key: string]: number } = {
                mensual: 12, bimestral: 6, trimestral: 4,
                cuatrimestral: 3, semestral: 2, anual: 1
            };
            const couponsPerYear = couponsPerYearMap[frecuencia] || 1;

            // Construir la 'graciaSerie' con la longitud correcta
            const graciaSerie = Array<'S' | 'P' | 'T'>(numAnios).fill('S');
            bondData.step2?.gracePeriodsConfig?.forEach((config) => {
                const yearIndex = Math.floor((config.couponNumber - 1) / couponsPerYear);
                if (yearIndex >= 0 && yearIndex < numAnios) {
                    graciaSerie[yearIndex] = config.graceType;
                }
            });

            // Inflación: si no está indexado, array de ceros; si está indexado, array del valor ingresado
            let inflacionSerie: number[];
            if (bondData.step2?.indexadoInflacion) {
                const inflacionAnual = parseFloat(bondData.step2?.inflacionAnual || '0') / 100;
                inflacionSerie = Array(numAnios).fill(inflacionAnual);
            } else {
                inflacionSerie = Array(numAnios).fill(0);
            }

            return {
                valorNominal: parseFloat(bondData.step1?.valorNominal || '1000'),
                valorComercial: parseFloat(bondData.step1?.valorComercial || '1050'),
                numAnios,
                frecuenciaCupon: frecuencia,
                diasPorAno: parseInt(bondData.step1?.diasPorAno || '360'),
                tipoTasa: bondData.step2?.tipoTasa || 'efectiva',
                periodicidadCapitalizacion: bondData.step2?.periodicidadCapitalizacion || 'semestral',
                tasaAnual: parseFloat(bondData.step2?.tasaAnual || '0') / 100,
                tasaDescuento: parseFloat(bondData.step2?.tasaDescuento || '0') / 100,
                impuestoRenta: parseFloat(bondData.step2?.impuestoRenta || '30') / 100,
                fechaEmision: bondData.step1?.fechaEmision ? new Date(bondData.step1.fechaEmision) : new Date(),
                primaPorcentaje: parseFloat(bondData.step2?.primaVencimiento || '0') / 100,
                estructuracionPorcentaje: parseFloat(bondData.step3?.estructuracionEmisor || '0') / 100,
                colocacionPorcentaje: parseFloat(bondData.step3?.colocacionEmisor || '0') / 100,
                flotacionPorcentaje: parseFloat(bondData.step3?.flotacionEmisor || '0') / 100,
                cavaliPorcentaje: parseFloat(bondData.step3?.cavaliEmisor || '0') / 100,
                inflacionSerie,
                graciaSerie
            };
        } catch (error) {
            console.error('Error en validación de inputs:', error);
            return null;
        }
    };

    // Funciones de formato
    const formatCurrency = (amount: string | number | null | undefined) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(typeof amount === 'string' ? parseFloat(amount) : amount || 0);
    };

    const formatPercent = (value: string | number | null | undefined) => {
        return `${((typeof value === 'string' ? parseFloat(value) : value || 0) * 100).toFixed(3)}%`;
    };

    const formatDate = (dateString: string | null | undefined) => {
        try {
            return new Date(dateString || '').toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        } catch {
            return "N/A";
        }
    };

    const getBondName = () => bondData.step1?.nombreInterno || bondData.step1?.name || "N/A";

    const toggleSection = (section: string) => {
        setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
    };

    const metricas = lastResult?.metricas?.emisor;
    const metricasBonista = lastResult?.metricas?.bonista;

    // ✅ VALIDACIÓN DE INPUTS PARA MOSTRAR AL USUARIO (sin usarlos para cálculos)
    const inputsValidation = buildCalculationInputsForValidation();
    const hasValidInputs = inputsValidation !== null;

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Revisión y Confirmación</h2>

            {bondId && (
                <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <h3 className="text-green-400 font-medium mb-2">✅ Bono Creado Exitosamente</h3>
                    <p className="text-green-300 text-sm">El bono "{getBondName()}" ha sido creado con ID: {bondId}</p>
                    <p className="text-green-200 text-xs mt-1">Ahora puedes calcular los flujos de caja financieros.</p>
                </div>
            )}

            {/* Sección de Datos Generales */}
            <div className="mb-8">
                <div className="bg-[#1E1E1E] rounded-lg">
                    <button
                        onClick={() => toggleSection('datos')}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#252525] transition"
                    >
                        <h3 className="text-lg font-semibold">Datos Generales</h3>
                        <ChevronDown className={`transform transition-transform ${expandedSections.datos ? 'rotate-180' : ''}`} size={20} />
                    </button>

                    {expandedSections.datos && (
                        <div className="p-4 pt-0 border-t border-[#2A2A2A]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-400 text-sm">Nombre del Bono</label>
                                    <p className="text-white font-medium">{getBondName()}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Código ISIN</label>
                                    <p className="text-white font-medium">{bondData.step1?.codigoIsin || "No especificado"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Valor Nominal</label>
                                    <p className="text-white font-medium">{formatCurrency(bondData.step1?.valorNominal)}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Valor Comercial</label>
                                    <p className="text-white font-medium">{formatCurrency(bondData.step1?.valorComercial)}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Duración</label>
                                    <p className="text-white font-medium">{bondData.step1?.numAnios || "0"} años</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Frecuencia de Cupón</label>
                                    <p className="text-white font-medium capitalize">{bondData.step1?.frecuenciaCupon || "semestral"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Fecha de Emisión</label>
                                    <p className="text-white font-medium">{formatDate(bondData.step1?.fechaEmision)}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Base de Días</label>
                                    <p className="text-white font-medium">{bondData.step1?.diasPorAno || "360"} días</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sección de Condiciones Financieras */}
                <div className="bg-[#1E1E1E] rounded-lg mt-4">
                    <button
                        onClick={() => toggleSection('condiciones')}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#252525] transition"
                    >
                        <h3 className="text-lg font-semibold">Condiciones Financieras</h3>
                        <ChevronDown className={`transform transition-transform ${expandedSections.condiciones ? 'rotate-180' : ''}`} size={20} />
                    </button>

                    {expandedSections.condiciones && (
                        <div className="p-4 pt-0 border-t border-[#2A2A2A]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-400 text-sm">Tipo de Tasa</label>
                                    <p className="text-white font-medium capitalize">{bondData.step2?.tipoTasa || "efectiva"}</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Tasa Anual</label>
                                    <p className="text-white font-medium">{bondData.step2?.tasaAnual || "0"}%</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Tasa de Descuento</label>
                                    <p className="text-white font-medium">{bondData.step2?.tasaDescuento || "4.50"}%</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Prima de Vencimiento</label>
                                    <p className="text-white font-medium">{bondData.step2?.primaVencimiento || "0"}%</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Indexado a Inflación</label>
                                    <p className="text-white font-medium">{bondData.step2?.indexadoInflacion ? "Sí" : "No"}</p>
                                </div>
                                {bondData.step2?.indexadoInflacion && (
                                    <div>
                                        <label className="text-gray-400 text-sm">Inflación Anual</label>
                                        <p className="text-white font-medium">{bondData.step2?.inflacionAnual || "0"}%</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sección de Costes */}
                <div className="bg-[#1E1E1E] rounded-lg mt-4">
                    <button
                        onClick={() => toggleSection('costes')}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#252525] transition"
                    >
                        <h3 className="text-lg font-semibold">Estructura de Costes</h3>
                        <ChevronDown className={`transform transition-transform ${expandedSections.costes ? 'rotate-180' : ''}`} size={20} />
                    </button>

                    {expandedSections.costes && (
                        <div className="p-4 pt-0 border-t border-[#2A2A2A]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-400 text-sm">Estructuración</label>
                                    <p className="text-white font-medium">{bondData.step3?.estructuracionEmisor || "0"}%</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Colocación</label>
                                    <p className="text-white font-medium">{bondData.step3?.colocacionEmisor || "0"}%</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">Flotación</label>
                                    <p className="text-white font-medium">{bondData.step3?.flotacionEmisor || "0"}%</p>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm">CAVALI</label>
                                    <p className="text-white font-medium">{bondData.step3?.cavaliEmisor || "0"}%</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {bondId && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold">Cálculos Financieros</h3>
                        <div className="flex items-center space-x-3">
                            {hasFlowsData && (
                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                                >
                                    <Download size={16} className="mr-2" />
                                    Descargar CSV
                                </button>
                            )}
                            <button
                                onClick={handleCalculateFlows}
                                disabled={isCalculating || !canCalculate || !hasValidInputs}
                                className={`flex items-center px-6 py-3 rounded-lg transition ${
                                    hasFlowsData
                                        ? "bg-[#1A3A1A] border-[#39FF14] text-[#39FF14] border"
                                        : "bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]"
                                } ${!hasValidInputs ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {isCalculating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                                        Calculando...
                                    </>
                                ) : hasFlowsData ? (
                                    <>
                                        <CheckCircle className="mr-2" size={16} />
                                        Flujos Calculados
                                    </>
                                ) : (
                                    <>
                                        <Calculator className="mr-2" size={16} />
                                        Calcular Flujos
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {!hasValidInputs && (
                        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-start">
                                <AlertCircle className="text-yellow-400 mr-3 mt-0.5 flex-shrink-0" size={16} />
                                <div>
                                    <h4 className="text-yellow-400 font-medium mb-1">Datos Incompletos</h4>
                                    <p className="text-yellow-300 text-sm">Algunos datos del bono están incompletos. Complete todos los campos para calcular.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {(calculationError || flowsError) && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-start">
                                <AlertCircle className="text-red-400 mr-3 mt-0.5 flex-shrink-0" size={16} />
                                <div>
                                    <h4 className="text-red-400 font-medium mb-1">Error en Cálculos</h4>
                                    <p className="text-red-300 text-sm">{calculationError || flowsError}</p>
                                    <p className="text-red-200 text-xs mt-2">
                                        Los datos están siendo auto-reparados. Intente calcular nuevamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {hasFlowsData && lastResult && (
                        <div>
                            <div className="mb-6 border-b border-[#2A2A2A] flex">
                                {[
                                    { id: "summary", label: "Resumen" },
                                    { id: "flows", label: "Flujos" },
                                    { id: "analytics", label: "Analytics" }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-3 px-6 text-sm font-medium border-b-2 transition ${
                                            activeTab === tab.id
                                                ? "text-[#39FF14] border-[#39FF14]"
                                                : "text-gray-400 border-transparent hover:text-white hover:border-[#39FF14]"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {activeTab === "summary" && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-4">Indicadores Clave (Emisor)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">VAN Emisor</p>
                                            <p className="text-[#39FF14] font-medium text-lg">{formatCurrency(metricas?.van || 0)}</p>
                                        </div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">TCEA Emisor (bruta)</p>
                                            <p className="text-[#39FF14] font-medium text-lg">{formatPercent(metricas?.tceaEmisor || 0)}</p>
                                        </div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">Duración</p>
                                            <p className="text-[#39FF14] font-medium text-lg">
                                                {metricas?.duracion ? `${metricas.duracion.toFixed(2)} años` : "N/A"}
                                            </p>
                                        </div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">Convexidad</p>
                                            <p className="text-[#39FF14] font-medium text-lg">
                                                {metricas?.convexidad ? metricas.convexidad.toFixed(2) : "N/A"}
                                            </p>
                                        </div>
                                        <div className="bg-[#1E1E1E] rounded-lg px-6 py-4">
                                            <p className="text-gray-400 text-xs mb-1">TREA Inversor</p>
                                            <p className="text-blue-400 font-medium text-lg">
                                                {metricasBonista?.treaBonista === 0 ?
                                                    "⚠️ TREA: 0.000%" :
                                                    formatPercent(metricasBonista?.treaBonista || 0)
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "flows" && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-4">Flujo de Caja Proyectado (Emisor)</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse min-w-[800px]">
                                            <thead>
                                            <tr className="bg-[#1A1A1A] text-gray-400 text-xs">
                                                <th className="py-2 px-3 text-center font-medium">Nº</th>
                                                <th className="py-2 px-3 text-left font-medium">Fecha</th>
                                                <th className="py-2 px-3 text-right font-medium">Bono Indexado</th>
                                                <th className="py-2 px-3 text-right font-medium">Cupón</th>
                                                <th className="py-2 px-3 text-right font-medium">Amortización</th>
                                                <th className="py-2 px-3 text-right font-medium">Prima</th>
                                                <th className="py-2 px-3 text-right font-medium">Escudo Fiscal</th>
                                                <th className="py-2 px-3 text-right font-medium">Flujo Emisor</th>
                                                <th className="py-2 px-3 text-right font-medium">Flujo c/Escudo</th>
                                            </tr>
                                            </thead>
                                            <tbody className="text-sm">
                                            {flows.slice(0, 5).map((flow) => (
                                                <tr key={flow.periodo} className="border-b border-[#2A2A2A] hover:bg-[#1E1E1E]">
                                                    <td className="py-2 px-3 text-center">{flow.periodo}</td>
                                                    <td className="py-2 px-3 text-left">{formatDate(flow.fecha)}</td>
                                                    <td className="py-2 px-3 text-right">{flow.bonoIndexado ? formatCurrency(flow.bonoIndexado) : "-"}</td>
                                                    <td className={`py-2 px-3 text-right ${flow.cupon && flow.cupon < 0 ? "text-red-400" : ""}`}>
                                                        {flow.cupon ? formatCurrency(flow.cupon) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${flow.amortizacion && flow.amortizacion < 0 ? "text-red-400" : ""}`}>
                                                        {flow.amortizacion ? formatCurrency(flow.amortizacion) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${flow.prima && flow.prima < 0 ? "text-red-400" : ""}`}>
                                                        {flow.prima ? formatCurrency(flow.prima) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${flow.escudoFiscal && flow.escudoFiscal > 0 ? "text-green-400" : ""}`}>
                                                        {flow.escudoFiscal ? formatCurrency(flow.escudoFiscal) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${flow.flujoEmisor && flow.flujoEmisor > 0 ? "text-green-400" : flow.flujoEmisor && flow.flujoEmisor < 0 ? "text-red-400" : ""}`}>
                                                        {flow.flujoEmisor ? formatCurrency(flow.flujoEmisor) : "-"}
                                                    </td>
                                                    <td className={`py-2 px-3 text-right ${flow.flujoEmisorConEscudo && flow.flujoEmisorConEscudo > 0 ? "text-green-400" : flow.flujoEmisorConEscudo && flow.flujoEmisorConEscudo < 0 ? "text-red-400" : ""}`}>
                                                        {flow.flujoEmisorConEscudo ? formatCurrency(flow.flujoEmisorConEscudo) : "-"}
                                                    </td>
                                                </tr>
                                            ))}
                                            {flows.length > 5 && (
                                                <tr>
                                                    <td colSpan={9} className="py-2 px-3 text-center text-gray-500 text-xs">
                                                        ... y {flows.length - 5} períodos más
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === "analytics" && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-4">Análisis Avanzado</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-[#1E1E1E] rounded-lg p-4">
                                            <h5 className="text-sm font-medium text-gray-400 mb-3">Sensibilidad a Tasas</h5>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-300">Duración Modificada:</span>
                                                    <span className="text-sm text-white">
                                                        {metricas?.duracionModificada ? metricas.duracionModificada.toFixed(3) : "N/A"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-300">Convexidad:</span>
                                                    <span className="text-sm text-white">
                                                        {metricas?.convexidad ? metricas.convexidad.toFixed(2) : "N/A"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-300">Ratio Total:</span>
                                                    <span className="text-sm text-white">
                                                        {metricas?.totalRatiosDecision ? metricas.totalRatiosDecision.toFixed(2) : "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#1E1E1E] rounded-lg p-4">
                                            <h5 className="text-sm font-medium text-gray-400 mb-3">Comparación Emisor vs Bonista</h5>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-300">TCEA Emisor:</span>
                                                    <span className="text-sm text-[#39FF14]">
                                                        {formatPercent(metricas?.tceaEmisor || 0)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-300">TREA Inversor:</span>
                                                    <span className="text-sm text-blue-400">
                                                        {formatPercent(metricasBonista?.treaBonista || 0)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-300">Spread:</span>
                                                    <span className="text-sm text-white">
                                                        {formatPercent((metricas?.tceaEmisor || 0) - (metricasBonista?.treaBonista || 0))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 bg-[#1E1E1E] rounded-lg p-4">
                                        <h5 className="text-sm font-medium text-gray-400 mb-3">Resumen Ejecutivo</h5>
                                        <div className="text-sm text-gray-300 space-y-2">
                                            <p>
                                                • El bono tiene una duración de <strong className="text-white">
                                                {metricas?.duracion ? metricas.duracion.toFixed(2) : "N/A"} años</strong>,
                                                indicando sensibilidad moderada a cambios en las tasas de interés.
                                            </p>
                                            <p>
                                                • La TCEA para el emisor es de <strong className="text-[#39FF14]">
                                                {formatPercent(metricas?.tceaEmisor || 0)}</strong>,
                                                mientras que la TREA para el bonista es de <strong className="text-blue-400">
                                                {formatPercent(metricasBonista?.treaBonista || 0)}</strong>.
                                            </p>
                                            <p>
                                                • Con el escudo fiscal, la TCEA efectiva del emisor se reduce a <strong className="text-[#39FF14]">
                                                {formatPercent(metricas?.tceaEmisorConEscudo || 0)}</strong>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}