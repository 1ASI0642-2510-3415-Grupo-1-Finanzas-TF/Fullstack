// app/emisor/dashboard/page.tsx - VERSIÓN CORREGIDA CON KPIs REALES
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChartIcon as ChartLine,
  Plus,
  Search,
  DollarSign,
  BadgeIcon as Certificate,
  HandCoins,
  Calendar,
  ChevronDown,
  ArrowUpDown,
  LogOut,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Eye,
  Calculator,
  CheckCircle,
  Clock,
  Pause,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEmisorBonds } from '@/lib/hooks/useEmisorBonds';
import { useDashboardMetrics } from '@/lib/hooks/useDashboardMetrics';

interface Bond {
  id: string;
  status: string;
  name: string;
  codigoIsin: string | null;
  nominalValue: number;
  commercialValue: number;
  years: number;
  tceaEmisor: number | null;
  createdAt: string;
}

export default function EmisorDashboard() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // 🔗 HOOKS REALES CONECTADOS
  const { user, isLoading: authLoading, logout } = useAuth({ requireRole: 'EMISOR' });

  // Hook para bonos (tabla)
  const {
    bonds,
    isLoading: bondsLoading,
    error: bondsError,
    refresh: refreshBonds,
    filterBonds,
  } = useEmisorBonds(user?.emisorProfile?.id || '', {
    status: statusFilter as any,
    refreshInterval: autoRefresh ? 30000 : 0,
  });

  // Hook para métricas del dashboard (KPIs)
  const {
    metrics: dashboardMetrics,
    isLoading: metricsLoading,
    error: metricsError,
    refresh: refreshMetrics,
  } = useDashboardMetrics(user?.emisorProfile?.id || '');

  // Verificar autenticación y perfil completo
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      
      // Si el usuario no tiene perfil de emisor, redirigir a completar perfil
      if (user.role === 'EMISOR' && !user.emisorProfile) {
        router.push("/auth/emisor-profile");
        return;
      }
    }
  }, [router, user, authLoading]);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("emisorProfile");
    logout?.() || router.push("/auth/login");
  };

  const handleRefresh = async () => {
    await Promise.all([refreshBonds(), refreshMetrics()]);
    setLastRefresh(new Date());
  };

  // 🎨 FUNCIONES DE FORMATO MEJORADAS
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "--";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "--";
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return "--";
    }
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return "N/A";
    return `${(value * 100).toFixed(2)}%`;
  };

  // Filtrar bonos
  const filteredBonds = filterBonds ? filterBonds(searchTerm, statusFilter) : [];

  // 📊 CALCULAR KPIs REALES CON useMemo PARA OPTIMIZACIÓN
  const kpis = useMemo(() => {
    if (!dashboardMetrics) {
      return {
        totalNominal: 0,
        activeBondsCount: 0,
        interestPaidYTD: 0,
        nextPaymentAmount: 0,
        nextPaymentDate: null,
      };
    }

    return {
      totalNominal: dashboardMetrics.totalNominalValue || 0,
      activeBondsCount: dashboardMetrics.activeBonds || 0,
      interestPaidYTD: dashboardMetrics.interestPaidYTD || 0,
      nextPaymentAmount: dashboardMetrics.nextPayment?.amount || 0,
      nextPaymentDate: dashboardMetrics.nextPayment?.date || null,
    };
  }, [dashboardMetrics]);

  // 🔄 ESTADOS DE CARGA Y ERROR
  if (authLoading || bondsLoading || metricsLoading) {
    return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#39FF14] mx-auto"></div>
            <p className="text-white mt-4">Cargando dashboard...</p>
          </div>
        </div>
    );
  }

  if (bondsError || metricsError) {
    return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
            <p className="text-red-400 mb-4">
              Error cargando datos: {bondsError || metricsError}
            </p>
            <button
                onClick={handleRefresh}
                className="bg-[#39FF14] text-black px-4 py-2 rounded-lg"
            >
              Reintentar
            </button>
          </div>
        </div>
    );
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
              <button
                  onClick={() => router.push("/emisor/create-bond")}
                  className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
              >
                <Plus className="mr-1 inline" size={16} />
                Nuevo Bono
              </button>
              <button onClick={handleLogout} className="text-[#39FF14] hover:text-white transition duration-250">
                <LogOut className="mr-1 inline" size={16} />
                Salir
              </button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 pt-24 pb-8">
          {/* Dashboard Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Dashboard de Emisor</h1>
            <p className="text-gray-400">Administra tus bonos americanos y visualiza su rendimiento</p>
          </div>

          {/* KPI Cards - CON DATOS REALES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-[#1E1E1E] to-[#242424] rounded-xl p-5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-gray-400 font-medium">Total nominal emitido</h3>
                <DollarSign className="text-gray-500" size={20} />
              </div>
              <div className="flex items-end">
                <span className="text-[#39FF14] text-3xl font-bold">{formatCurrency(kpis.totalNominal)}</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#1E1E1E] to-[#242424] rounded-xl p-5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-gray-400 font-medium">Bonos activos</h3>
                <Certificate className="text-gray-500" size={20} />
              </div>
              <div className="flex items-end">
                <span className="text-[#39FF14] text-3xl font-bold">{kpis.activeBondsCount}</span>
                <span className="text-gray-400 ml-1 mb-1">bonos</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#1E1E1E] to-[#242424] rounded-xl p-5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-gray-400 font-medium">Intereses pagados YTD</h3>
                <HandCoins className="text-gray-500" size={20} />
              </div>
              <div className="flex items-end">
                <span className="text-[#39FF14] text-3xl font-bold">{formatCurrency(kpis.interestPaidYTD)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Desde 01 Ene, {new Date().getFullYear()}</p>
            </div>

            <div className="bg-gradient-to-br from-[#1E1E1E] to-[#242424] rounded-xl p-5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-gray-400 font-medium">Próximo pago de cupón</h3>
                <Calendar className="text-gray-500" size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[#39FF14] text-3xl font-bold">{formatCurrency(kpis.nextPaymentAmount)}</span>
                <span className="text-gray-400 text-sm mt-1">
                  {kpis.nextPaymentDate ? formatDate(kpis.nextPaymentDate) : "--"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Total de todos los bonos</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
            <div className="relative">
              <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-4 pr-10 appearance-none focus:outline-none focus:border-[#39FF14] transition"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="completed">Completado</option>
              </select>
              <ChevronDown
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
              />
            </div>

            <div className="relative w-full md:w-64">
              <input
                  type="text"
                  placeholder="Buscar bono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#151515] border border-[#2A2A2A] rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-[#39FF14] transition"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>

          {/* Bonds Table - EXACTAMENTE COMO TU MAQUETA */}
          <div className="bg-[#151515] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Código
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Nombre
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      V. Nominal
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      V. Comercial Rec.
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Plazo (años)
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Cupón (%)
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      TCEA Emisor c/E
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Fecha Emisión
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition">
                    <div className="flex items-center">
                      Estado
                      <ArrowUpDown className="ml-1" size={12} />
                    </div>
                  </th>
                </tr>
                </thead>
                <tbody>
                {filteredBonds.map((bond: Bond) => (
                    <tr
                        key={bond.id}
                        onClick={() => router.push(`/emisor/bond/${bond.id}`)}
                        className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A] cursor-pointer transition"
                    >
                      <td className="px-6 py-4 text-sm">{bond.codigoIsin || bond.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-sm">{bond.name}</td>
                      <td className="px-6 py-4 text-sm">{formatCurrency(bond.nominalValue)}</td>
                      <td className="px-6 py-4 text-sm">{formatCurrency(bond.commercialValue)}</td>
                      <td className="px-6 py-4 text-sm">{bond.years}</td>
                      <td className="px-6 py-4 text-sm">
                        {bond.tceaEmisor ? `${(bond.tceaEmisor * 100).toFixed(2)}%` : '--'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {bond.tceaEmisor ? formatPercent(bond.tceaEmisor) : 'Sin calcular'}
                      </td>
                      <td className="px-6 py-4 text-sm">{formatDate(bond.createdAt)}</td>
                      <td className="px-6 py-4 text-sm">
                      <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              bond.status === "ACTIVE"
                                  ? "bg-green-900 text-green-400"
                                  : bond.status === "DRAFT"
                                      ? "bg-yellow-900 text-yellow-400"
                                      : bond.status === "PAUSED"
                                          ? "bg-orange-900 text-orange-400"
                                          : "bg-red-900 text-red-400"
                          }`}
                      >
                        {bond.status === "ACTIVE" ? "Activo" :
                            bond.status === "DRAFT" ? "Borrador" :
                                bond.status === "PAUSED" ? "Pausado" : "Vencido"}
                      </span>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {filteredBonds.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center">
                  <div className="w-40 h-40 mb-6 flex items-center justify-center">
                    <DollarSign className="text-gray-700" size={80} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No hay bonos para mostrar</h3>
                  <p className="text-gray-400 mb-6 text-center max-w-md">
                    {searchTerm || statusFilter !== 'all'
                        ? 'No se encontraron bonos que coincidan con los filtros aplicados.'
                        : 'Aún no has creado ningún bono. Comienza creando tu primer bono.'}
                  </p>
                  <button
                      onClick={() => router.push("/emisor/create-bond")}
                      className="bg-[#39FF14] text-black font-bold px-5 py-2 rounded-lg hover:shadow-[0_0_8px_rgba(57,255,20,0.47)] transition duration-250"
                  >
                    <Plus className="mr-1 inline" size={16} />
                    Crear nuevo bono
                  </button>
                </div>
            )}
          </div>
        </main>
      </div>
  );
}