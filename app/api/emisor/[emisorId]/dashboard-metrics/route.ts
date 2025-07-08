// app/api/emisor/[emisorId]/dashboard-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, MetricsRole, BondStatus } from '@/lib/generated/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const ParamsSchema = z.object({
    emisorId: z.string().cuid('ID de emisor inválido'),
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ emisorId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { emisorId } = ParamsSchema.parse(resolvedParams);

        console.log('📊 Calculando métricas del dashboard para emisor:', emisorId);

        // 1. Verificar que el emisor existe
        const emisor = await prisma.emisorProfile.findUnique({
            where: { id: emisorId },
            select: { id: true, companyName: true },
        });

        if (!emisor) {
            return NextResponse.json(
                { error: 'Emisor no encontrado' },
                { status: 404 }
            );
        }

        // 2. Obtener todos los bonos del emisor con sus métricas
        const bonds = await prisma.bond.findMany({
            where: { emisorId },
            include: {
                financialMetrics: {
                    where: { role: MetricsRole.EMISOR },
                    select: {
                        tcea: true,
                        van: true,
                        duracion: true,
                        tir: true,
                        precioActual: true,
                        utilidadPerdida: true
                    },
                },
                cashFlows: {
                    select: {
                        cupon: true,
                        fecha: true,
                        periodo: true,
                    },
                    orderBy: { periodo: 'asc' }
                }
            },
        });

        // 3. Calcular KPIs agregados
        const totalBonds = bonds.length;
        const activeBonds = bonds.filter(bond => bond.status === BondStatus.ACTIVE);
        const activeBondsCount = activeBonds.length;

        // Total valor nominal de bonos activos
        const totalNominalValue = activeBonds.reduce((sum, bond) =>
            sum + bond.valorNominal.toNumber(), 0
        );

        // TCEA promedio (solo bonos activos con métricas)
        const bondsWithTCEA = activeBonds.filter(bond =>
            bond.financialMetrics.length > 0 && bond.financialMetrics[0].tcea
        );

        const averageTCEA = bondsWithTCEA.length > 0
            ? bondsWithTCEA.reduce((sum, bond) =>
            sum + bond.financialMetrics[0].tcea!.toNumber(), 0
        ) / bondsWithTCEA.length
            : 0;

        // 4. Calcular intereses pagados YTD (estimación basada en cupones)
        const currentYear = new Date().getFullYear();
        let interestPaidYTD = 0;

        for (const bond of activeBonds) {
            if (bond.cashFlows.length > 0) {
                // Sumar cupones del año actual
                const ytdCoupons = bond.cashFlows
                    .filter(flow => {
                        const flowYear = new Date(flow.fecha).getFullYear();
                        return flowYear === currentYear && flow.cupon && flow.periodo > 0;
                    })
                    .reduce((sum, flow) => sum + (flow.cupon?.toNumber() || 0), 0);

                interestPaidYTD += ytdCoupons;
            } else {
                // Estimación aproximada si no hay flujos calculados
                const estimatedAnnualInterest = bond.valorNominal.toNumber() * bond.tasaAnual.toNumber();
                const monthsPassed = new Date().getMonth() + 1;
                interestPaidYTD += (estimatedAnnualInterest * monthsPassed) / 12;
            }
        }

        // 5. Calcular próximo pago de cupón
        let nextPaymentAmount = 0;
        let nextPaymentDate: Date | null = null;

        const now = new Date();
        for (const bond of activeBonds) {
            if (bond.cashFlows.length > 0) {
                // Buscar el próximo cupón futuro
                const nextCoupon = bond.cashFlows
                    .filter(flow => new Date(flow.fecha) > now && flow.cupon && flow.periodo > 0)
                    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];

                if (nextCoupon) {
                    nextPaymentAmount += nextCoupon.cupon?.toNumber() || 0;

                    // Usar la fecha más próxima
                    const couponDate = new Date(nextCoupon.fecha);
                    if (!nextPaymentDate || couponDate < nextPaymentDate) {
                        nextPaymentDate = couponDate;
                    }
                }
            } else {
                // Estimación si no hay flujos
                const estimatedCoupon = bond.valorNominal.toNumber() * bond.tasaAnual.toNumber() * 0.5; // Asumiendo semestral
                nextPaymentAmount += estimatedCoupon;
            }
        }

        // Si no hay fecha específica, estimar próximo pago
        if (!nextPaymentDate && activeBondsCount > 0) {
            nextPaymentDate = new Date();
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 6); // 6 meses aprox
        }

        // 6. Formatear respuesta con enum values válidos
        const metrics = {
            totalBonds,
            activeBonds: activeBondsCount,
            totalNominalValue,
            averageTCEA,
            interestPaidYTD,
            nextPayment: {
                amount: nextPaymentAmount,
                date: nextPaymentDate?.toISOString().split('T')[0] || null,
            },
            // Métricas adicionales usando enum values
            draftBonds: bonds.filter(bond => bond.status === BondStatus.DRAFT).length,
            // Solo incluir estas métricas si los valores existen en el enum
            ...(Object.values(BondStatus).includes('ACTIVE' as BondStatus) && {
                pausedBonds: bonds.filter(bond => bond.status === 'ACTIVE').length,
            }),
            ...(Object.values(BondStatus).includes('COMPLETED' as BondStatus) && {
                completedBonds: bonds.filter(bond => bond.status === 'EXPIRED').length,
            }),
        };

        console.log('✅ Métricas calculadas:', metrics);

        return NextResponse.json({
            success: true,
            metrics,
            updatedAt: new Date().toISOString(),
        });

    } catch (error) {
        console.error('❌ Error calculando métricas del dashboard:', error);

        return NextResponse.json({
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ?
                (error instanceof Error ? error.message : 'Error desconocido') :
                'Error inesperado'
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}