// app/emisor/create-bond/components/Step3Dynamic.tsx - CORREGIDO
'use client';

import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

interface BondData {
    step1?: {
        name?: string;
        nombreInterno?: string;
        valorNominal?: string;
        valorComercial?: string;
    };
    step3?: {
        estructuracionEmisor?: string;
        colocacionEmisor?: string;
        flotacionEmisor?: string;
        cavaliEmisor?: string;
        emisorTotalAbs?: string;
        bonistaTotalAbs?: string;
        totalCostsAbs?: string;
    };
}

interface Step3Props {
    bondData: BondData;
    saveDataAction: (data: any, step: number) => void;
}

// ✅ EXPORT POR DEFECTO
export default function Step3Dynamic({ bondData, saveDataAction }: Step3Props) {
    const [formData, setFormData] = useState({
        estructuracionEmisor: bondData.step3?.estructuracionEmisor || "1.00",
        colocacionEmisor: bondData.step3?.colocacionEmisor || "0.25",
        flotacionEmisor: bondData.step3?.flotacionEmisor || "0.225",
        cavaliEmisor: bondData.step3?.cavaliEmisor || "0.25",
    });

    // Obtener valor comercial del step1 (maneja ambos nombres de campo)
    const valorComercial = parseFloat(bondData.step1?.valorComercial || "0");

    const calculateCosts = () => {
        const estructuracionEmisorVal = parseFloat(formData.estructuracionEmisor) || 0;
        const colocacionEmisorVal = parseFloat(formData.colocacionEmisor) || 0;
        const flotacionEmisorVal = parseFloat(formData.flotacionEmisor) || 0;
        const cavaliEmisorVal = parseFloat(formData.cavaliEmisor) || 0;

        const flotacionBonistaVal = Math.max(0, 0.45 - flotacionEmisorVal);
        const cavaliBonistaVal = Math.max(0, 0.5 - cavaliEmisorVal);

        const emisorCostAbs =
            ((estructuracionEmisorVal + colocacionEmisorVal + flotacionEmisorVal + cavaliEmisorVal) / 100) * valorComercial;

        const bonistaCostAbs = ((flotacionBonistaVal + cavaliBonistaVal) / 100) * valorComercial;

        return {
            emisorTotalAbs: emisorCostAbs,
            bonistaTotalAbs: bonistaCostAbs,
            totalCostsAbs: emisorCostAbs,
            flotacionBonistaVal,
            cavaliBonistaVal,
        };
    };

    const costs = calculateCosts();

    const handleChange = (field: string, value: string) => {
        const newFormData = { ...formData, [field]: value };
        setFormData(newFormData);

        const newCosts = calculateCosts();
        saveDataAction(
            {
                ...newFormData,
                emisorTotalAbs: newCosts.emisorTotalAbs.toString(),
                bonistaTotalAbs: newCosts.bonistaTotalAbs.toString(),
                totalCostsAbs: newCosts.totalCostsAbs.toString(),
            },
            3,
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Costes Iniciales</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="overflow-x-auto">
                        <table className="w-full mb-4 min-w-[700px]">
                            <thead>
                            <tr className="border-b border-[#2A2A2A] text-[#AAAAAA]">
                                <th className="text-left py-3 px-3 font-medium text-sm">Concepto</th>
                                <th className="text-center py-3 px-3 font-medium text-sm">% Mercado</th>
                                <th className="text-center py-3 px-3 font-medium text-sm">% Emisor</th>
                                <th className="text-center py-3 px-3 font-medium text-sm">% Bonista</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr className="border-b border-[#2A2A2A]">
                                <td className="py-4 px-3">Estructuración</td>
                                <td className="py-2 px-3 text-center text-white">1.00%</td>
                                <td className="py-2 px-3">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.estructuracionEmisor}
                                            onChange={(e) => handleChange("estructuracionEmisor", e.target.value)}
                                            className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-3 py-2 text-center focus:outline-none focus:border-[#39FF14] transition"
                                            step="0.01"
                                            min="0"
                                            max="0"
                                        />
                                        <div className="absolute inset-y-0 right-2 flex items-center text-gray-500 pointer-events-none text-xs">
                                            %
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2 px-3 text-center text-gray-500">0.00%</td>
                            </tr>
                            <tr className="border-b border-[#2A2A2A]">
                                <td className="py-4 px-3">Colocación</td>
                                <td className="py-2 px-3 text-center text-white">0.25%</td>
                                <td className="py-2 px-3">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.colocacionEmisor}
                                            onChange={(e) => handleChange("colocacionEmisor", e.target.value)}
                                            className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-3 py-2 text-center focus:outline-none focus:border-[#39FF14] transition"
                                            step="0.01"
                                            min="0"
                                            max="0.25"
                                        />
                                        <div className="absolute inset-y-0 right-2 flex items-center text-gray-500 pointer-events-none text-xs">
                                            %
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2 px-3 text-center text-gray-500">0.00%</td>
                            </tr>
                            <tr className="border-b border-[#2A2A2A]">
                                <td className="py-4 px-3">Flotación</td>
                                <td className="py-2 px-3 text-center text-white">0.35%</td>
                                <td className="py-2 px-3">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.flotacionEmisor}
                                            onChange={(e) => handleChange("flotacionEmisor", e.target.value)}
                                            className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-3 py-2 text-center focus:outline-none focus:border-[#39FF14] transition"
                                            step="0.001"
                                            min="0"
                                            max="0.45"
                                        />
                                        <div className="absolute inset-y-0 right-2 flex items-center text-gray-500 pointer-events-none text-xs">
                                            %
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2 px-3 text-center text-white">{costs.flotacionBonistaVal.toFixed(3)}%</td>
                            </tr>
                            <tr>
                                <td className="py-4 px-3">CAVALI</td>
                                <td className="py-2 px-3 text-center text-white">0.50%</td>
                                <td className="py-2 px-3">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.cavaliEmisor}
                                            onChange={(e) => handleChange("cavaliEmisor", e.target.value)}
                                            className="w-full bg-transparent text-white border border-[#2A2A2A] rounded-lg px-3 py-2 text-center focus:outline-none focus:border-[#39FF14] transition"
                                            step="0.01"
                                            min="0"
                                            max="0.5"
                                        />
                                        <div className="absolute inset-y-0 right-2 flex items-center text-gray-500 pointer-events-none text-xs">
                                            %
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2 px-3 text-center text-white">{costs.cavaliBonistaVal.toFixed(2)}%</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-[#1E1E1E] rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Resumen de Costes</h3>
                        <div className="space-y-6">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">Costes Emisor</p>
                                <p className="text-[#39FF14] text-2xl font-semibold">{formatCurrency(costs.emisorTotalAbs)}</p>
                            </div>
                            <div className="pt-4 border-t border-[#2A2A2A]">
                                <p className="text-gray-400 text-sm mb-1">Total Costes</p>
                                <p className="text-[#39FF14] text-2xl font-semibold">{formatCurrency(costs.totalCostsAbs)}</p>
                            </div>
                            <div className="bg-[#252525] rounded-lg p-4">
                                <div className="flex items-center text-sm">
                                    <Info className="text-gray-400 mr-2" size={16} />
                                    <p>
                                        Los costes se calculan sobre el <strong className="text-white">Valor Comercial</strong> del bono:{" "}
                                        <span className="text-white">{formatCurrency(valorComercial)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}