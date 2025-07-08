// app/emisor/create-bond/components/Step2Dynamic.tsx - EXPORT CORREGIDO
'use client';

import { useState, useEffect } from 'react';
import { Info, Percent, ChevronDown } from 'lucide-react';

interface BondData {
    step1?: {
        name?: string;
        nombreInterno?: string;
        codigoISIN?: string;
        valorNominal?: string;
        valorComercial?: string;
        numAnios?: string;
        fechaEmision?: string;
        frecuenciaCupon?: string;
        baseDias?: string;
        diasPorAno?: string;
    };
    step2?: {
        tipoTasa: string;
        periodicidadCapitalizacion: string;
        tasaAnual: string;
        indexadoInflacion: boolean;
        inflacionAnual: string;
        primaVencimiento: string;
        impuestoRenta: string;
        numGracePeriods: number;
        gracePeriodsConfig: GracePeriodConfig[];
    };
}

interface GracePeriodConfig {
    couponNumber: number;
    graceType: 'T' | 'P' | 'S';
}

interface Step2Props {
    bondData: BondData;
    saveDataAction: (data: any, step: number) => void;
}

// ✅ EXPORT POR DEFECTO
export default function Step2Dynamic({ bondData, saveDataAction }: Step2Props) {
    const [formData, setFormData] = useState({
        tipoTasa: bondData.step2?.tipoTasa || 'efectiva',
        periodicidadCapitalizacion: bondData.step2?.periodicidadCapitalizacion || 'semestral',
        tasaAnual: bondData.step2?.tasaAnual || '',
        indexadoInflacion: bondData.step2?.indexadoInflacion || false,
        inflacionAnual: bondData.step2?.inflacionAnual || '',
        primaVencimiento: bondData.step2?.primaVencimiento || '',
        impuestoRenta: bondData.step2?.impuestoRenta || '30',
        numGracePeriods: bondData.step2?.numGracePeriods || 0,
        gracePeriodsConfig: bondData.step2?.gracePeriodsConfig || [],
    });

    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [totalCoupons, setTotalCoupons] = useState(0);
    const [maxGracePeriods, setMaxGracePeriods] = useState(0);

    // Calculate total coupons based on Step 1 data
    useEffect(() => {
        if (bondData.step1) {
            const years = parseInt(bondData.step1.numAnios || bondData.step1.numAnios || '5');
            const frequency = bondData.step1.frecuenciaCupon || 'anual';

            const frequencyMap: Record<string, number> = {
                'mensual': 12,
                'bimestral': 6,
                'trimestral': 4,
                'cuatrimestral': 3,
                'semestral': 2,
                'anual': 1,
            };

            const calculatedTotalCoupons = years * (frequencyMap[frequency] || 1);
            const calculatedMaxGrace = Math.max(0, calculatedTotalCoupons - 1);

            setTotalCoupons(calculatedTotalCoupons);
            setMaxGracePeriods(calculatedMaxGrace);
        }
    }, [bondData.step1]);

    const handleChange = (field: string, value: string | boolean | number) => {
        const newFormData = { ...formData, [field]: value };
        setFormData(newFormData);
        setErrors({ ...errors, [field]: false });
        saveDataAction(newFormData, 2);
    };

    const handleGracePeriodsChange = (numPeriods: number) => {
        if (numPeriods > maxGracePeriods) {
            numPeriods = maxGracePeriods;
        }

        // Initialize grace periods configuration
        const graceConfig: GracePeriodConfig[] = [];
        for (let i = 1; i <= totalCoupons; i++) {
            graceConfig.push({
                couponNumber: i,
                graceType: i <= numPeriods ? 'T' : 'S'
            });
        }

        const newFormData = {
            ...formData,
            numGracePeriods: numPeriods,
            gracePeriodsConfig: graceConfig
        };

        setFormData(newFormData);
        saveDataAction(newFormData, 2);
    };

    const updateGraceType = (couponNumber: number, newGraceType: 'T' | 'P' | 'S') => {
        const updatedConfig = formData.gracePeriodsConfig.map(config =>
            config.couponNumber === couponNumber
                ? { ...config, graceType: newGraceType }
                : config
        );

        const newFormData = {
            ...formData,
            gracePeriodsConfig: updatedConfig
        };

        setFormData(newFormData);
        saveDataAction(newFormData, 2);
    };

    const getBlockStyle = (graceType: 'T' | 'P' | 'S') => {
        const baseClasses = 'flex flex-col items-center p-3 rounded-lg border w-24 transition-all duration-200';

        switch (graceType) {
            case 'T':
                return `${baseClasses} border-red-500`;
            case 'P':
                return `${baseClasses} border-yellow-500`;
            case 'S':
                return `${baseClasses} border-green-500`;
            default:
                return `${baseClasses} border-gray-500`;
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Condiciones Financieras</h2>

            <form>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tipo de Tasa */}
                    <div>
                        <label className="block text-[#AAAAAA] text-sm mb-2">Tipo de tasa</label>
                        <div className="relative">
                            <select
                                value={formData.tipoTasa}
                                onChange={(e) => handleChange('tipoTasa', e.target.value)}
                                className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition appearance-none"
                            >
                                <option value="efectiva">Efectiva</option>
                                <option value="nominal">Nominal</option>
                            </select>
                            <ChevronDown className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500" size={16} />
                        </div>
                        {formData.tipoTasa === 'nominal' && (
                            <div className="mt-2 text-xs text-gray-400">
                                <Info className="inline mr-1" size={12} />
                                Fórmula: TEA = (1 + TNA/m)^m - 1
                            </div>
                        )}
                    </div>

                    {/* Periodicidad de Capitalización (solo para nominal) */}
                    {formData.tipoTasa === 'nominal' && (
                        <div>
                            <label className="block text-[#AAAAAA] text-sm mb-2">Periodicidad de capitalización</label>
                            <div className="relative">
                                <select
                                    value={formData.periodicidadCapitalizacion}
                                    onChange={(e) => handleChange('periodicidadCapitalizacion', e.target.value)}
                                    className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition appearance-none"
                                >
                                    <option value="mensual">Mensual</option>
                                    <option value="semestral">Semestral</option>
                                    <option value="anual">Anual</option>
                                </select>
                                <ChevronDown className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500" size={16} />
                            </div>
                        </div>
                    )}

                    {/* Tasa Anual */}
                    <div>
                        <label className="block text-[#AAAAAA] text-sm mb-2">Tasa anual (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={formData.tasaAnual}
                                onChange={(e) => handleChange('tasaAnual', e.target.value)}
                                className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition ${
                                    errors.tasaAnual ? 'border-red-500' : 'border-[#2A2A2A]'
                                }`}
                                placeholder="8.00"
                                step="0.01"
                            />
                            <Percent className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500" size={16} />
                        </div>
                    </div>

                    {/* Indexado a Inflación */}
                    <div>
                        <label className="block text-[#AAAAAA] text-sm mb-2">Indexado a Inflación</label>
                        <div className="flex items-center mt-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.indexadoInflacion}
                                    onChange={(e) => handleChange('indexadoInflacion', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#888] after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#39FF1422] peer-checked:after:bg-[#39FF14]"></div>
                            </label>
                        </div>
                    </div>

                    {/* Inflación Anual (solo si está indexado) */}
                    {formData.indexadoInflacion && (
                        <div>
                            <label className="block text-[#AAAAAA] text-sm mb-2">Inflación anual esperada (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={formData.inflacionAnual}
                                    onChange={(e) => handleChange('inflacionAnual', e.target.value)}
                                    className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition"
                                    placeholder="10.00"
                                    step="0.01"
                                />
                                <Percent className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500" size={16} />
                            </div>
                        </div>
                    )}

                    {/* Prima al Vencimiento */}
                    <div>
                        <label className="block text-[#AAAAAA] text-sm mb-2">Prima al vencimiento (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={formData.primaVencimiento}
                                onChange={(e) => handleChange('primaVencimiento', e.target.value)}
                                className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition ${
                                    errors.primaVencimiento ? 'border-red-500' : 'border-[#2A2A2A]'
                                }`}
                                placeholder="1.00"
                                step="0.01"
                            />
                            <Percent className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500" size={16} />
                        </div>
                    </div>
                </div>

                {/* Configuración de Períodos de Gracia */}
                <div className="mt-8 border-t border-[#2A2A2A] pt-8">
                    <h3 className="text-lg font-semibold mb-4">Configuración de Períodos de Gracia Iniciales</h3>

                    {/* Info Box */}
                    <div className="mb-4 p-4 bg-[#1A1A1A] rounded-lg border-l-4 border-[#39FF14]">
                        <p className="text-sm text-gray-300">
                            <Info className="inline text-[#39FF14] mr-2" size={16} />
                            Defina los tipos de gracia para los primeros períodos de cupón. Una vez que un período es "S" (Sin Gracia), todos los siguientes serán "S".
                        </p>
                    </div>

                    {/* Grace Periods Input */}
                    <div className="mb-6">
                        <label className="block text-[#AAAAAA] text-sm mb-2">
                            ¿Cuántos períodos de cupón iniciales tendrán gracia (T o P)?
                        </label>
                        <div className="relative max-w-xs">
                            <input
                                type="number"
                                value={formData.numGracePeriods}
                                onChange={(e) => handleGracePeriodsChange(parseInt(e.target.value) || 0)}
                                min="0"
                                max={maxGracePeriods}
                                step="1"
                                className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition"
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-400">
                            Máximo permitido: <span>{maxGracePeriods}</span> períodos
                        </p>
                    </div>

                    {/* Grace Periods Timeline */}
                    {formData.numGracePeriods > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-[#AAAAAA] mb-3">Línea de Tiempo de Pagos de Cupón</h4>
                            <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
                                <div className="flex flex-wrap gap-4">
                                    {formData.gracePeriodsConfig.map((config) => {
                                        const isConfigurable = config.couponNumber <= formData.numGracePeriods;

                                        return (
                                            <div
                                                key={config.couponNumber}
                                                className={getBlockStyle(config.graceType)}
                                            >
                                                <span className="text-xs text-gray-400">Cupón {config.couponNumber}</span>
                                                <span className="font-bold text-lg my-2">{config.graceType}</span>
                                                {isConfigurable && (
                                                    <div className="flex space-x-1 mt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateGraceType(config.couponNumber, 'T')}
                                                            className={`w-6 h-6 rounded-full text-xs font-bold bg-red-500 text-white border-2 border-transparent ${
                                                                config.graceType === 'T' ? 'ring-2 ring-white' : ''
                                                            }`}
                                                        >
                                                            T
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateGraceType(config.couponNumber, 'P')}
                                                            className={`w-6 h-6 rounded-full text-xs font-bold bg-yellow-500 text-white border-2 border-transparent ${
                                                                config.graceType === 'P' ? 'ring-2 ring-white' : ''
                                                            }`}
                                                        >
                                                            P
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-sm mr-2"></span>
                  Gracia Total (T)
                </span>
                                <span className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-yellow-500 rounded-sm mr-2"></span>
                  Gracia Parcial (P)
                </span>
                                <span className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-sm mr-2"></span>
                  Sin Gracia (S)
                </span>
                            </p>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}