// app/emisor/create-bond/page.tsx - CORREGIDO
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChartIcon as ChartLine,
  ArrowLeft,
  ArrowRight,
  Check,
  RocketIcon,
} from 'lucide-react';

import Step1Dynamic from './components/Step1Dynamic';
import Step2Dynamic from './components/Step2Dynamic';
import Step3Dynamic from './components/Step3Dynamic';
import Step4Dynamic from './components/Step4Dynamic';

// Interfaces de datos
interface GracePeriodConfig {
  couponNumber: number;
  graceType: 'T' | 'P' | 'S';
}

interface BondData {
  step1?: {
    name: string;
    codigoIsin: string;
    valorNominal: string;
    valorComercial: string;
    numAnios: string;
    fechaEmision: string;
    frecuenciaCupon: string;
    diasPorAno: string;
  };
  step2?: {
    tipoTasa: string;
    periodicidadCapitalizacion: string;
    tasaAnual: string;
    tasaDescuento: string;
    indexadoInflacion: boolean;
    inflacionAnual: string;
    primaVencimiento: string;
    impuestoRenta: string;
    numGracePeriods: number;
    gracePeriodsConfig: GracePeriodConfig[];
  };
  step3?: {
    estructuracionEmisor: string;
    colocacionEmisor: string;
    flotacionEmisor: string;
    cavaliEmisor: string;
    emisorTotalAbs: string;
    bonistaTotalAbs: string;
    totalCostsAbs: string;
    flotacionBonista: string;
    cavaliBonista: string;
  };
}

export default function CreateBondWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [bondData, setBondData] = useState<BondData>({});
  const [createdBondId, setCreatedBondId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emisorProfile, setEmisorProfile] = useState<any>(null);

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "emisor") {
      router.push("/auth/login");
      return;
    }

    const profileStr = localStorage.getItem("emisorProfile");
    if (profileStr) {
      setEmisorProfile(JSON.parse(profileStr));
    }

    const savedData = localStorage.getItem('bondWizardData');
    if (savedData) {
      try {
        setBondData(JSON.parse(savedData));
      } catch (error) {
        console.warn('Error parsing saved wizard data:', error);
      }
    }
  }, [router]);

  const saveData = (stepData: any, step: number) => {
    const newData = { ...bondData, [`step${step}`]: stepData };
    setBondData(newData);
    localStorage.setItem('bondWizardData', JSON.stringify(newData));
  };

  const getUserEmisorId = (): string => {
    if (emisorProfile?.id) {
      return emisorProfile.id;
    }
    throw new Error('Perfil de emisor no encontrado. No se puede crear el bono.');
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return bondData.step1?.name && bondData.step1?.valorNominal && bondData.step1?.valorComercial;
      case 2:
        return bondData.step2?.tasaAnual && bondData.step2?.primaVencimiento && bondData.step2?.impuestoRenta;
      case 3:
        return bondData.step3?.estructuracionEmisor;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceedToNext() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (currentStep !== 4 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🚀 Iniciando proceso de creación de bono...');

      // ✅ --- INICIO DE LA CORRECCIÓN ---
      const numAnios = parseInt(bondData.step1?.numAnios || '0');
      const frecuencia = bondData.step1?.frecuenciaCupon || 'semestral';

      // 1. Calcular dinámicamente los cupones por año
      const couponsPerYearMap: { [key: string]: number } = {
        mensual: 12, bimestral: 6, trimestral: 4,
        cuatrimestral: 3, semestral: 2, anual: 1
      };
      const couponsPerYear = couponsPerYearMap[frecuencia] || 1;

      // 2. Construir la 'graciaSerie' con la longitud correcta (igual a numAnios)
      const graciaSerie = Array<'S' | 'P' | 'T'>(numAnios).fill('S');
      bondData.step2?.gracePeriodsConfig?.forEach((config) => {
        // Convertir el número de cupón al índice del año correspondiente
        const yearIndex = Math.floor((config.couponNumber - 1) / couponsPerYear);
        if (yearIndex >= 0 && yearIndex < numAnios) {
          graciaSerie[yearIndex] = config.graceType;
        }
      });
      // ✅ --- FIN DE LA CORRECCIÓN ---

      const completeData = {
        // Step 1 data
        name: bondData.step1?.name || '',
        codigoIsin: bondData.step1?.codigoIsin || '',
        valorNominal: parseFloat(bondData.step1?.valorNominal || '0'),
        valorComercial: parseFloat(bondData.step1?.valorComercial || '0'),
        numAnios: numAnios,
        fechaEmision: bondData.step1?.fechaEmision || new Date().toISOString().split('T')[0],
        frecuenciaCupon: frecuencia,
        diasPorAno: parseInt(bondData.step1?.diasPorAno || '360'),

        // Step 2 data
        tipoTasa: bondData.step2?.tipoTasa || 'efectiva',
        periodicidadCapitalizacion: bondData.step2?.periodicidadCapitalizacion || 'semestral',
        tasaAnual: parseFloat(bondData.step2?.tasaAnual || '0') / 100,
        tasaDescuento: parseFloat(bondData.step2?.tasaDescuento || '0') / 100,
        primaPorcentaje: parseFloat(bondData.step2?.primaVencimiento || '0') / 100,
        impuestoRenta: parseFloat(bondData.step2?.impuestoRenta || '30') / 100,
        inflacionSerie: bondData.step2?.indexadoInflacion
            ? Array(numAnios).fill(parseFloat(bondData.step2?.inflacionAnual || '0') / 100)
            : Array(numAnios).fill(0),

        // Step 3 data
        estructuracionPorcentaje: parseFloat(bondData.step3?.estructuracionEmisor || '0') / 100,
        colocacionPorcentaje: parseFloat(bondData.step3?.colocacionEmisor || '0') / 100,
        flotacionPorcentaje: parseFloat(bondData.step3?.flotacionEmisor || '0') / 100,
        cavaliPorcentaje: parseFloat(bondData.step3?.cavaliEmisor || '0') / 100,

        // Períodos de gracia - AHORA SE ENVÍA LA SERIE CORRECTA
        graciaSerie: graciaSerie,

        // Emisor ID
        emisorId: getUserEmisorId(),
      };

      console.log('📤 Enviando datos completos y corregidos:', completeData);

      const response = await fetch('/api/bonds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el bono');
      }

      const newBondId = result.bondId;
      console.log('✅ Bono creado exitosamente:', newBondId);
      setCreatedBondId(newBondId);

      localStorage.removeItem('bondWizardData');

      // ✅ MEJORA: Disparar el cálculo inicial de flujos justo después de la creación
      console.log(`🚀 Disparando cálculo inicial para el bono ${newBondId}...`);
      try {
        const calcResponse = await fetch(`/api/bonds/${newBondId}/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saveResults: true }) // Asegurarse de que los resultados se guarden
        });
        if (!calcResponse.ok) {
          const calcError = await calcResponse.json();
          throw new Error(calcError.error || 'El cálculo inicial falló.');
        }
        console.log(`✅ Cálculo inicial para ${newBondId} completado.`);
      } catch (calcError: any) {
        console.warn(`⚠️ El cálculo inicial falló, pero el bono fue creado. Se podrá recalcular más tarde. Error: ${calcError.message}`);
        // No relanzar el error para no asustar al usuario. El bono ya está creado.
      }


    } catch (error: any) {
      console.error('❌ Error en handleSubmit:', error);
      alert('Error creando el bono: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgressPercentage = () => (currentStep / 4) * 100;

  return (
      <div className="min-h-screen bg-[#0D0D0D] text-white font-inter">
        <header className="fixed top-0 left-0 w-full bg-black bg-opacity-75 backdrop-blur-md z-50 py-4">
          <div className="container mx-auto px-6 flex justify-between items-center">
            <div className="flex items-center">
              <ChartLine className="text-[#39FF14] text-2xl mr-2" size={24} />
              <span className="text-white text-xl font-semibold">BonoApp</span>
            </div>
            <button
                onClick={() => router.push("/emisor/dashboard")}
                className="text-gray-400 hover:text-white transition flex items-center"
            >
              <ArrowLeft className="mr-1" size={16} />
              Volver
            </button>
          </div>
        </header>

        <main className="container mx-auto px-6 pt-24 pb-8 flex justify-center">
          <div className="bg-[#151515] rounded-xl w-full max-w-[960px] overflow-hidden">
            <div className="border-b border-[#2A2A2A] p-6">
              <h1 className="text-2xl font-bold mb-1">Crear Nuevo Bono</h1>
              <p className="text-gray-400">Complete la información necesaria para configurar su nuevo bono</p>
            </div>
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Progreso: {getProgressPercentage().toFixed(0)}%</div>
                <div className="text-sm text-gray-400">Paso {currentStep} de 4</div>
              </div>
              <div className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                <div
                    className="h-full bg-[#39FF14] transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>

              <div className="flex justify-between mt-4 pb-6 relative">
                <div className="absolute top-3 left-0 right-0 h-0.5 bg-[#2A2A2A] -z-10" />
                {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex flex-col items-center z-10">
                      <div
                          className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold mb-2 ${
                              step < currentStep
                                  ? "bg-[#39FF14] text-black"
                                  : step === currentStep
                                      ? "bg-[#39FF14] text-black"
                                      : "bg-[#2A2A2A] text-gray-500"
                          }`}
                      >
                        {step < currentStep ? <Check size={12} /> : step}
                      </div>
                      <span className={`text-xs font-medium ${step <= currentStep ? "text-[#39FF14]" : "text-gray-500"}`}>
                      {["Datos", "Finanzas", "Costes", "Revisión"][step - 1]}
                    </span>
                    </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6">
              {currentStep === 1 && <Step1Dynamic bondData={bondData} saveDataAction={saveData} />}
              {currentStep === 2 && <Step2Dynamic bondData={bondData} saveDataAction={saveData} />}
              {currentStep === 3 && <Step3Dynamic bondData={bondData} saveDataAction={saveData} />}
              {currentStep === 4 && <Step4Dynamic bondData={bondData} bondId={createdBondId} />}

              <div className="flex justify-between mt-10">
                <button
                    onClick={currentStep === 1 ? () => router.push("/emisor/dashboard") : handlePrevious}
                    className="px-6 py-3 border border-[#2A2A2A] rounded-lg text-gray-300 hover:bg-[#1A1A1A] transition flex items-center"
                    disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2" size={16} />
                  {currentStep === 1 ? "Cancelar" : "Anterior"}
                </button>

                {currentStep < 4 ? (
                    <button
                        onClick={handleNext}
                        disabled={!canProceedToNext()}
                        className={`px-6 py-3 rounded-lg font-medium transition flex items-center ${
                            canProceedToNext()
                                ? "bg-[#39FF14] text-black hover:shadow-[0_0_8px_rgba(57,255,20,0.47)]"
                                : "bg-gray-600 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                      {currentStep === 3 ? "Ir a Revisión" : "Guardar y Continuar"}
                      <ArrowRight className="ml-2" size={16} />
                    </button>
                ) : (
                    createdBondId ? (
                        <button
                            onClick={() => router.push(`/emisor/bond/${createdBondId}`)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center"
                        >
                          Ver Bono Creado
                          <ArrowRight className="ml-2" size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-3 rounded-lg font-medium transition flex items-center bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-600"
                        >
                          {isSubmitting ? (
                              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Creando Bono...</>
                          ) : (
                              <><RocketIcon className="mr-2" size={16} />Confirmar y Crear Bono</>
                          )}
                        </button>
                    )
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
  );
}