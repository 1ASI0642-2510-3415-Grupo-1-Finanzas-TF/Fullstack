import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, InvestmentStatus } from '../../../../../lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema de validación para parámetros
const ParamsSchema = z.object({
    inversionistaId: z.string().cuid('ID de inversionista inválido'),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ inversionistaId: string }> }
) {
    try {
        // 1. Await params (Next.js 15 cambio)
        const resolvedParams = await params;
        const { inversionistaId } = ParamsSchema.parse(resolvedParams);

        console.log('📊 Obteniendo métricas del dashboard para inversionista:', inversionistaId);

        // 2. Verificar que el inversionista existe
        const inversionista = await prisma.inversionistaProfile.findUnique({
            where: { id: inversionistaId },
            select: { 
                id: true, 
                firstName: true, 
                lastName: true,
                userId: true 
            },
        });

        if (!inversionista) {
            console.log('❌ Inversionista no encontrado:', inversionistaId);
            return NextResponse.json(
                { error: 'Inversionista no encontrado', code: 'INVERSIONISTA_NOT_FOUND' },
                { status: 404 }
            );
        }

        // 3. Obtener todas las inversiones del usuario con datos relacionados
        const investments = await prisma.userInvestment.findMany({
            where: { userId: inversionista.userId },
            include: {
                bond: {
                    include: {
                        emisor: {
                            select: {
                                id: true,
                                companyName: true,
                                industry: true,
                            }
                        },
                        financialMetrics: {
                            where: { role: 'BONISTA' },
                            select: {
                                precioActual: true,
                                trea: true,
                                van: true,
                                duracion: true,
                                convexidad: true,
                                utilidadPerdida: true,
                            }
                        },
                        cashFlows: {
                            where: {
                                cupon: { not: null },
                                periodo: { gt: 0 }
                            },
                            orderBy: { periodo: 'asc' },
                            select: {
                                periodo: true,
                                fecha: true,
                                cupon: true,
                                flujoBonista: true
                            }
                        }
                    }
                }
            },
            orderBy: { fechaInversion: 'desc' },
        });

        // 4. Calcular métricas del portfolio
        const activeInvestments = investments.filter(inv => inv.status === InvestmentStatus.ACTIVE);
        const completedInvestments = investments.filter(inv => inv.status === InvestmentStatus.COMPLETED);

        // Métricas básicas
        const totalInvested = activeInvestments.reduce((sum, inv) => 
            sum + inv.montoInvertido.toNumber(), 0
        );
        const totalUnrealizedGain = activeInvestments.reduce((sum, inv) => 
            sum + inv.gananciaNoRealizada.toNumber(), 0
        );
        const averageReturn = activeInvestments.length > 0 
            ? activeInvestments.reduce((sum, inv) => sum + inv.rendimientoActual.toNumber(), 0) / activeInvestments.length
            : 0;

        // 5. Calcular intereses YTD (Year to Date)
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        
        let totalInterestYTD = 0;
        activeInvestments.forEach(investment => {
            const bond = investment.bond;
            const investedAmount = investment.montoInvertido.toNumber();
            const nominalValue = bond.valorNominal.toNumber();
            const couponRate = bond.tasaAnual.toNumber();
            
            // Calcular cupones recibidos este año
            const couponPayments = bond.cashFlows.filter(flow => {
                const flowDate = new Date(flow.fecha);
                return flowDate >= yearStart && flowDate <= yearEnd && flow.cupon && flow.cupon.toNumber() > 0;
            });
            
            // Sumar cupones recibidos
            const yearCoupons = couponPayments.reduce((sum, flow) => {
                const couponAmount = flow.cupon!.toNumber();
                // Proporcionar el cupón según el monto invertido
                const proportionalCoupon = (investedAmount / nominalValue) * couponAmount;
                return sum + proportionalCoupon;
            }, 0);
            
            totalInterestYTD += yearCoupons;
        });

        // 6. Calcular valor actual del portfolio
        let currentPortfolioValue = 0;
        let portfolioReturn = 0;

        activeInvestments.forEach(investment => {
            const currentPrice = investment.bond.financialMetrics[0]?.precioActual.toNumber() || 100;
            const purchasePrice = investment.precioCompra.toNumber();
            const investedAmount = investment.montoInvertido.toNumber();
            
            // Calcular valor actual de esta inversión
            const currentValue = (investedAmount / purchasePrice) * currentPrice;
            currentPortfolioValue += currentValue;
            
            // Calcular retorno de esta inversión
            const investmentReturn = ((currentValue - investedAmount) / investedAmount) * 100;
            portfolioReturn += investmentReturn;
        });

        const averagePortfolioReturn = activeInvestments.length > 0 ? portfolioReturn / activeInvestments.length : 0;

        // 7. Calcular distribución por emisor
        const emisorDistribution = activeInvestments.reduce((acc, inv) => {
            const emisorName = inv.bond.emisor.companyName;
            if (!acc[emisorName]) {
                acc[emisorName] = {
                    emisorId: inv.bond.emisor.id,
                    emisorName,
                    industry: inv.bond.emisor.industry,
                    totalInvested: 0,
                    investments: 0,
                };
            }
            acc[emisorName].totalInvested += inv.montoInvertido.toNumber();
            acc[emisorName].investments += 1;
            return acc;
        }, {} as Record<string, any>);

        // 8. Calcular distribución por industria
        const industryDistribution = Object.values(emisorDistribution).reduce((acc: any, emisor: any) => {
            const industry = emisor.industry || 'Sin industria';
            if (!acc[industry]) {
                acc[industry] = {
                    industry,
                    totalInvested: 0,
                    emisores: 0,
                };
            }
            acc[industry].totalInvested += emisor.totalInvested;
            acc[industry].emisores += 1;
            return acc;
        }, {});

        // 9. Calcular métricas de riesgo
        const averageDuration = activeInvestments.length > 0 
            ? activeInvestments.reduce((sum, inv) => 
                sum + (inv.bond.financialMetrics[0]?.duracion.toNumber() || 0), 0) / activeInvestments.length
            : 0;

        const averageConvexity = activeInvestments.length > 0 
            ? activeInvestments.reduce((sum, inv) => 
                sum + (inv.bond.financialMetrics[0]?.convexidad.toNumber() || 0), 0) / activeInvestments.length
            : 0;

        // 10. Calcular próximos pagos de cupón de manera más precisa
        const today = new Date();
        const nextCouponPayments = activeInvestments
            .map(inv => {
                const bond = inv.bond;
                const investedAmount = inv.montoInvertido.toNumber();
                const nominalValue = bond.valorNominal.toNumber();
                const couponRate = bond.tasaAnual.toNumber();
                
                // Encontrar el próximo cupón basado en los flujos de caja
                const nextCoupon = bond.cashFlows.find(flow => {
                    const flowDate = new Date(flow.fecha);
                    return flowDate > today && flow.cupon && flow.cupon.toNumber() > 0;
                });
                
                if (nextCoupon) {
                    const couponAmount = nextCoupon.cupon!.toNumber();
                    const proportionalCoupon = (investedAmount / nominalValue) * couponAmount;
                    
                    return {
                        bondId: bond.id,
                        bondName: bond.name,
                        emisor: bond.emisor.companyName,
                        nextPayment: nextCoupon.fecha.toISOString().split('T')[0],
                        daysUntilPayment: Math.ceil((new Date(nextCoupon.fecha).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
                        investedAmount: investedAmount,
                        couponAmount: proportionalCoupon,
                        couponRate: couponRate
                    };
                }
                return null;
            })
            .filter(payment => payment !== null && payment.daysUntilPayment > 0)
            .sort((a, b) => a!.daysUntilPayment - b!.daysUntilPayment)
            .slice(0, 5); // Top 5 próximos pagos

        // 11. Calcular rendimiento histórico (últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const recentInvestments = investments.filter(inv => 
            inv.fechaInversion >= sixMonthsAgo
        );

        const monthlyPerformance = Array.from({ length: 6 }, (_, i) => {
            const month = new Date();
            month.setMonth(month.getMonth() - i);
            const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
            const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
            
            const monthInvestments = investments.filter(inv => 
                inv.fechaInversion >= monthStart && inv.fechaInversion <= monthEnd
            );
            
            return {
                month: month.toISOString().slice(0, 7), // YYYY-MM
                investments: monthInvestments.length,
                amount: monthInvestments.reduce((sum, inv) => sum + inv.montoInvertido.toNumber(), 0),
                return: monthInvestments.reduce((sum, inv) => sum + inv.rendimientoActual.toNumber(), 0),
            };
        }).reverse();

        // 12. Formatear respuesta
        const response = {
            success: true,
            inversionista: {
                id: inversionista.id,
                name: `${inversionista.firstName} ${inversionista.lastName}`,
            },
            kpis: {
                totalInvested,
                currentPortfolioValue,
                totalUnrealizedGain,
                totalInterestYTD, // Intereses reales YTD
                portfolioReturn: averagePortfolioReturn,
                totalInvestments: investments.length,
                activeInvestments: activeInvestments.length,
                completedInvestments: completedInvestments.length,
                averageReturn,
                averageDuration,
                averageConvexity,
            },
            distribution: {
                byEmisor: Object.values(emisorDistribution),
                byIndustry: Object.values(industryDistribution),
            },
            upcomingPayments: nextCouponPayments,
            performance: {
                monthly: monthlyPerformance,
                topPerformers: activeInvestments
                    .sort((a, b) => b.rendimientoActual.toNumber() - a.rendimientoActual.toNumber())
                    .slice(0, 3)
                    .map(inv => ({
                        bondId: inv.bondId,
                        bondName: inv.bond.name,
                        emisor: inv.bond.emisor.companyName,
                        return: inv.rendimientoActual.toNumber(),
                        investedAmount: inv.montoInvertido.toNumber(),
                    })),
            },
            riskMetrics: {
                averageDuration,
                averageConvexity,
                riskLevel: averageDuration > 5 ? 'HIGH' : averageDuration > 3 ? 'MEDIUM' : 'LOW',
                diversificationScore: Object.keys(emisorDistribution).length / Math.max(activeInvestments.length, 1),
            },
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('❌ Error obteniendo métricas del dashboard:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Parámetros inválidos',
                details: error.errors,
                code: 'VALIDATION_ERROR',
            }, { status: 400 });
        }

        return NextResponse.json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
} 