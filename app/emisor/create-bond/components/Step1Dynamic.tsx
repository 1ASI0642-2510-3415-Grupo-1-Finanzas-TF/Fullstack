// app/emisor/create-bond/components/Step1Dynamic.tsx - EXPORT CORREGIDO
'use client';

import { useState, useEffect } from 'react';
import { Calendar, DollarSign, FileText, Clock } from 'lucide-react';

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
}

interface Step1Props {
    bondData: BondData;
    saveDataAction: (data: any, step: number) => void;
}

// ✅ EXPORT POR DEFECTO
export default function Step1Dynamic({ bondData, saveDataAction }: Step1Props) {
    const [formData, setFormData] = useState({
        name: bondData.step1?.name || '',
        codigoIsin: bondData.step1?.codigoIsin || '',
        valorNominal: bondData.step1?.valorNominal || '',
        valorComercial: bondData.step1?.valorComercial || '',
        numAnios: bondData.step1?.numAnios || '5',
        fechaEmision: bondData.step1?.fechaEmision || new Date().toISOString().split('T')[0],
        frecuenciaCupon: bondData.step1?.frecuenciaCupon || 'semestral',
        diasPorAno: bondData.step1?.diasPorAno || '360',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Validación en tiempo real
    useEffect(() => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Nombre requerido';
        }

        if (!formData.valorNominal || Number(formData.valorNominal) <= 0) {
            newErrors.valorNominal = 'Valor nominal debe ser mayor a 0';
        }

        if (!formData.valorComercial || Number(formData.valorComercial) <= 0) {
            newErrors.valorComercial = 'Valor comercial debe ser mayor a 0';
        }

        if (!formData.numAnios || Number(formData.numAnios) <= 0) {
            newErrors.numAnios = 'Número de años debe ser mayor a 0';
        }

        if (Number(formData.valorComercial) < Number(formData.valorNominal)) {
            newErrors.valorComercial = 'Valor comercial debe ser mayor o igual al nominal';
        }

        setErrors(newErrors);

        // Guardar datos automáticamente (consistente con Step2 y Step3)
        saveDataAction(formData, 1);
    }, [formData]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isValid = Object.keys(errors).length === 0 &&
        formData.name.trim() &&
        formData.valorNominal &&
        formData.valorComercial &&
        formData.numAnios;

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Datos Generales del Bono</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre del Bono */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Nombre del Bono *
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 pl-10 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition ${
                                errors.name ? 'border-red-500' : 'border-[#2A2A2A]'
                            }`}
                            placeholder="Ej. Bono VAC Serie I"
                        />
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    </div>
                    {errors.name && (
                        <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                    )}
                </div>

                {/* Código ISIN */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Código ISIN (Opcional)
                    </label>
                    <input
                        type="text"
                        value={formData.codigoIsin}
                        onChange={(e) => handleChange('codigoIsin', e.target.value)}
                        className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition"
                        placeholder="PE0000000000"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                        Si está vacío, se generará automáticamente
                    </p>
                </div>

                {/* Valor Nominal */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Valor Nominal (USD) *
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={formData.valorNominal}
                            onChange={(e) => handleChange('valorNominal', e.target.value)}
                            className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 pl-10 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition ${
                                errors.valorNominal ? 'border-red-500' : 'border-[#2A2A2A]'
                            }`}
                            placeholder="1000"
                            step="0.01"
                            min="0"
                        />
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    </div>
                    {errors.valorNominal && (
                        <p className="mt-1 text-xs text-red-400">{errors.valorNominal}</p>
                    )}
                </div>

                {/* Valor Comercial */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Valor Comercial (USD) *
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={formData.valorComercial}
                            onChange={(e) => handleChange('valorComercial', e.target.value)}
                            className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 pl-10 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition ${
                                errors.valorComercial ? 'border-red-500' : 'border-[#2A2A2A]'
                            }`}
                            placeholder="1050"
                            step="0.01"
                            min="0"
                        />
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    </div>
                    {errors.valorComercial && (
                        <p className="mt-1 text-xs text-red-400">{errors.valorComercial}</p>
                    )}
                </div>

                {/* Número de Años */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Duración (años) *
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={formData.numAnios}
                            onChange={(e) => handleChange('numAnios', e.target.value)}
                            className={`w-full bg-transparent text-white border rounded-lg px-4 py-3 pl-10 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition ${
                                errors.numAnios ? 'border-red-500' : 'border-[#2A2A2A]'
                            }`}
                            placeholder="5"
                            step="1"
                            min="1"
                            max="30"
                        />
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    </div>
                    {errors.numAnios && (
                        <p className="mt-1 text-xs text-red-400">{errors.numAnios}</p>
                    )}
                </div>

                {/* Fecha de Emisión */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Fecha de Emisión *
                    </label>
                    <div className="relative">
                        <input
                            type="date"
                            value={formData.fechaEmision}
                            onChange={(e) => handleChange('fechaEmision', e.target.value)}
                            className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-4 py-3 pl-10 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    </div>
                </div>

                {/* Frecuencia de Cupón */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Frecuencia de Cupón *
                    </label>
                    <select
                        value={formData.frecuenciaCupon}
                        onChange={(e) => handleChange('frecuenciaCupon', e.target.value)}
                        className="w-full bg-[#111] text-white border border-[#2A2A2A] rounded-lg px-4 py-3 focus:outline-none focus:border-[#39FF14] focus:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition"
                    >
                        <option value="anual">Anual</option>
                        <option value="mensual">Mensual</option>
                        <option value="bimestral">Bimestral</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="cuatrimestral">Cuatrimestral</option>
                        <option value="semestral">Semestral</option>
                    </select>

                </div>

                {/* Base de Días */}
                <div>
                    <label className="block text-[#AAAAAA] text-sm mb-2">
                        Base de Días
                    </label>
                    <input
                        type="text"
                        value="360 días"
                        readOnly
                        className="w-full bg-[#111111] text-white border border-[#2A2A2A] rounded-lg px-4 py-3"
                    />
                </div>

            </div>

            {/* Información Calculada */}
            {formData.numAnios && formData.frecuenciaCupon && (
                <div className="mt-6 p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">
                        📊 Información Calculada
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Total de cupones:</span>
                            <span className="ml-2 text-white font-medium">
                {(() => {
                    const years = parseInt(formData.numAnios) || 1;
                    const frequencyMap: Record<string, number> = {
                        mensual: 12,
                        bimestral: 6,
                        trimestral: 4,
                        cuatrimestral: 3,
                        semestral: 2,
                        anual: 1,
                    };
                    return years * (frequencyMap[formData.frecuenciaCupon] || 1);
                })()}
              </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Fecha vencimiento:</span>
                            <span className="ml-2 text-white font-medium">
                {(() => {
                    const fechaEmision = new Date(formData.fechaEmision);
                    fechaEmision.setFullYear(fechaEmision.getFullYear() + (parseInt(formData.numAnios) || 0));
                    return fechaEmision.toLocaleDateString('es-ES');
                })()}
              </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Prima de emisión:</span>
                            <span className="ml-2 text-white font-medium">
                {formData.valorNominal && formData.valorComercial
                    ? `${(((Number(formData.valorComercial) - Number(formData.valorNominal)) / Number(formData.valorNominal)) * 100).toFixed(2)}%`
                    : '0.00%'}
              </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Resumen de datos válidos */}
            {isValid && (
                <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <h3 className="text-green-400 font-medium mb-2">✅ Datos Válidos</h3>
                    <p className="text-green-300 text-sm">
                        Bono "{formData.name}" por ${Number(formData.valorNominal).toLocaleString()}
                        a {formData.numAnios} años con cupones {formData.frecuenciaCupon}es.
                    </p>
                </div>
            )}
        </div>
    );
}