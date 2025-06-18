// lib/services/bonds/BondCalculations.ts - CORRECCIÓN

import {
    PrismaClient,
    Prisma,
    MetricsRole
} from '../../generated/client';
import { FinancialCalculator } from '@/lib/services/calculations/FinancialCalculator';
import { BondModel, BondWithFullRelations } from '@/lib/models/Bond';
import { CashFlowModel } from '@/lib/models/CashFlow';
import {
    CalculationInputs,
    CalculationResult,
    FrequenciaCupon,
    GracePeriodType,
    PrecisionConfig
} from '@/lib/types/calculations';
import { z } from 'zod';
import { Decimal } from 'decimal.js';

export const CalculateBondRequestSchema = z.object({
    bondId: z.string().cuid('ID de bono inválido'),
    recalculate: z.boolean().default(false),
    saveResults: z.boolean().default(true),
});

export type CalculateBondRequest = z.infer<typeof CalculateBondRequestSchema>;

export interface BondCalculationResponse {
    bondId: string;
    success: boolean;
    calculatedAt: Date;
    metricas: {
        emisor: {
            precioActual: number; van: number; tceaEmisor: number; tceaEmisorConEscudo: number;
            duracion: number; duracionModificada: number; convexidad: number; totalRatiosDecision: number;
        };
        bonista: {
            precioActual: number; van: number; treaBonista: number;
            duracion: number; duracionModificada: number; convexidad: number; totalRatiosDecision: number;
        };
    };
    flowsCount: number;
    errors?: string[];
}

export class BondCalculationsService {
    private calculator: FinancialCalculator;
    private bondModel: BondModel;
    private cashFlowModel: CashFlowModel;

    constructor(private prisma: PrismaClient) {
        const precisionSettings: PrecisionConfig = {
            decimalPlaces: 6,
            tolerance: 1e-8,
            roundingMode: Decimal.ROUND_HALF_UP,
        };
        this.calculator = new FinancialCalculator({
            validateInputs: true,
            includeIntermediateSteps: true,
            precision: precisionSettings
        });
        this.bondModel = new BondModel(prisma);
        this.cashFlowModel = new CashFlowModel(prisma);
    }

    async calculateBond(request: CalculateBondRequest): Promise<BondCalculationResponse> {
        const validatedRequest = CalculateBondRequestSchema.parse(request);
        const { bondId, recalculate, saveResults } = validatedRequest;

        try {
            if (!recalculate) {
                const existingCalculation = await this.getExistingCalculation(bondId);
                if (existingCalculation) return existingCalculation;
            }

            const bond = await this.bondModel.findById(bondId);
            if (!bond) throw new Error(`Bono ${bondId} no encontrado`);

            await this.validateBondForCalculation(bond);

            // ✅ CORRECCIÓN: Obtener y validar inputs antes de calcular
            const calculationInputs = await this.convertBondToCalculationInputs(bond);

            // ✅ VALIDACIÓN ADICIONAL: Verificar que las series sean consistentes
            await this.validateSeriesConsistency(bond.id, calculationInputs);

            console.log(`🔄 Calculando flujos para bono ${bond.name}...`);
            const startTime = Date.now();
            const calculationResult = await this.calculator.calculate(calculationInputs);
            const duration = Date.now() - startTime;
            console.log(`✅ Cálculos completados en ${duration}ms`);

            if (saveResults) {
                if (!calculationInputs.id) {
                    throw new Error("ID de CalculationInputs (registro de DB) no encontrado para guardar resultados.");
                }
                await this.saveCalculationResults(bondId, calculationInputs.id, calculationResult);
            }
            return this.formatCalculationResponse(bondId, calculationResult);
        } catch (error) {
            console.error(`❌ Error calculando bono ${bondId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                bondId, success: false, calculatedAt: new Date(),
                metricas: this.getEmptyMetrics(), flowsCount: 0, errors: [errorMessage],
            };
        }
    }

    // ✅ MÉTODO NUEVO: Validar consistencia de series
    private async validateSeriesConsistency(bondId: string, calculationInputs: CalculationInputs): Promise<void> {
        const errors: string[] = [];
        const numAnios = calculationInputs.numAnios;

        // Validar longitud de inflacionSerie
        if (calculationInputs.inflacionSerie.length !== numAnios) {
            errors.push(
                `La serie de inflación debe tener ${numAnios} elementos (recibidos ${calculationInputs.inflacionSerie.length})`
            );
        }

        // Validar longitud de graciaSerie
        if (calculationInputs.graciaSerie.length !== numAnios) {
            errors.push(
                `La serie de gracia debe tener ${numAnios} elementos (recibidos ${calculationInputs.graciaSerie.length})`
            );
        }

        if (errors.length > 0) {
            console.error(`❌ Series inconsistentes para bono ${bondId}:`, errors);

            // ✅ AUTO-CORRECCIÓN: Intentar reparar las series automáticamente
            try {
                await this.repairInconsistentSeries(bondId, numAnios);
                console.log(`🔧 Series auto-reparadas para bono ${bondId}`);
            } catch (repairError) {
                console.error(`❌ Falló la auto-reparación para bono ${bondId}:`, repairError);
                throw new Error(`Validation failed: ${errors.join(', ')}`);
            }
        }
    }

    // ✅ MÉTODO NUEVO: Auto-reparar series inconsistentes
    private async repairInconsistentSeries(bondId: string, expectedLength: number): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const calcInputs = await tx.calculationInputs.findUnique({
                where: { bondId },
                select: { inflacionSerie: true, graciaSerie: true }
            });

            if (!calcInputs) {
                throw new Error(`CalculationInputs no encontrado para bono ${bondId}`);
            }

            const currentInflacion = calcInputs.inflacionSerie as number[];
            const currentGracia = calcInputs.graciaSerie as GracePeriodType[];

            // Reparar inflacionSerie
            let repairedInflacion: number[];
            if (currentInflacion.length !== expectedLength) {
                if (currentInflacion.length === 0) {
                    // Si está vacía, llenar con 0s
                    repairedInflacion = Array(expectedLength).fill(0);
                } else {
                    // Si tiene datos, tomar el primer valor y replicarlo
                    const defaultValue = currentInflacion[0] || 0;
                    repairedInflacion = Array(expectedLength).fill(defaultValue);
                }
            } else {
                repairedInflacion = currentInflacion;
            }

            // Reparar graciaSerie
            let repairedGracia: GracePeriodType[];
            if (currentGracia.length !== expectedLength) {
                if (currentGracia.length === 0) {
                    // Si está vacía, llenar con 'S' (sin gracia)
                    repairedGracia = Array(expectedLength).fill('S');
                } else {
                    // Si tiene datos, tomar el primer valor y replicarlo
                    const defaultValue = currentGracia[0] || 'S';
                    repairedGracia = Array(expectedLength).fill(defaultValue);
                }
            } else {
                repairedGracia = currentGracia;
            }

            // Actualizar en la base de datos
            await tx.calculationInputs.update({
                where: { bondId },
                data: {
                    inflacionSerie: repairedInflacion,
                    graciaSerie: repairedGracia
                }
            });

            console.log(`🔧 Auto-reparación completada:
                - inflacionSerie: ${currentInflacion.length} → ${repairedInflacion.length} elementos
                - graciaSerie: ${currentGracia.length} → ${repairedGracia.length} elementos`);
        });
    }

    async calculateQuickMetrics(bondId: string): Promise<BondCalculationResponse> {
        try {
            const bond = await this.bondModel.findById(bondId);
            if (!bond) throw new Error(`Bono ${bondId} no encontrado para quick metrics`);

            const calculationInputs = await this.convertBondToCalculationInputs(bond);

            // ✅ VALIDACIÓN TAMBIÉN EN QUICK METRICS
            await this.validateSeriesConsistency(bond.id, calculationInputs);

            const quickMetricsResult = await this.calculator.calculateQuickMetrics(calculationInputs);

            return {
                bondId,
                success: true,
                calculatedAt: new Date(),
                metricas: {
                    emisor: {
                        precioActual: quickMetricsResult.precioActual,
                        van: quickMetricsResult.utilidadPerdida,
                        tceaEmisor: quickMetricsResult.tceaEmisor,
                        tceaEmisorConEscudo: quickMetricsResult.tceaEmisorConEscudo,
                        duracion: quickMetricsResult.duracion,
                        duracionModificada: quickMetricsResult.duracionModificada,
                        convexidad: quickMetricsResult.convexidad,
                        totalRatiosDecision: quickMetricsResult.totalRatiosDecision,
                    },
                    bonista: {
                        precioActual: quickMetricsResult.precioActual,
                        van: quickMetricsResult.precioActual,
                        treaBonista: quickMetricsResult.treaBonista,
                        duracion: quickMetricsResult.duracion,
                        duracionModificada: quickMetricsResult.duracionModificada,
                        convexidad: quickMetricsResult.convexidad,
                        totalRatiosDecision: quickMetricsResult.totalRatiosDecision,
                    },
                },
                flowsCount: 0,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                bondId, success: false, calculatedAt: new Date(),
                metricas: this.getEmptyMetrics(), flowsCount: 0, errors: [errorMessage],
            };
        }
    }

    async calculateMultipleBonds(
        bondIds: string[],
        options: { parallel?: boolean; batchSize?: number; onProgress?: (completed: number, total: number) => void; } = {}
    ): Promise<BondCalculationResponse[]> {
        const { parallel = false, batchSize = 5, onProgress } = options;
        const results: BondCalculationResponse[] = [];

        const processBond = async (bondId: string): Promise<BondCalculationResponse> => {
            return this.calculateBond({ bondId, recalculate: true, saveResults: true });
        };

        if (parallel) {
            for (let i = 0; i < bondIds.length; i += batchSize) {
                const batch = bondIds.slice(i, i + batchSize);
                const batchPromises = batch.map(processBond);
                const batchResultsSettled = await Promise.allSettled(batchPromises);

                for (const settledResult of batchResultsSettled) {
                    if (settledResult.status === 'fulfilled') {
                        results.push(settledResult.value);
                    } else {
                        const errorMessage = settledResult.reason instanceof Error ? settledResult.reason.message : String(settledResult.reason);
                        const originalPromiseIndex = batchPromises.findIndex(p => p === (settledResult as any)._promise);
                        const failedBondId = originalPromiseIndex !== -1 ? batch[originalPromiseIndex] : 'unknown_in_batch';
                        results.push({
                            bondId: failedBondId,
                            success: false, calculatedAt: new Date(), metricas: this.getEmptyMetrics(),
                            flowsCount: 0, errors: [errorMessage],
                        });
                    }
                }
                if (onProgress) onProgress(Math.min(i + batchSize, bondIds.length), bondIds.length);
            }
        } else {
            for (let i = 0; i < bondIds.length; i++) {
                const result = await processBond(bondIds[i]);
                results.push(result);
                if (onProgress) onProgress(i + 1, bondIds.length);
            }
        }
        return results;
    }

    async getCalculatedFlows(bondId: string, userRole: 'emisor' | 'inversionista') {
        const hasFlows = await this.cashFlowModel.hasFlows(bondId);
        if (!hasFlows) {
            const result = await this.calculateBond({ bondId, recalculate: true, saveResults: true });
            if (!result.success) {
                throw new Error(`No se pudieron calcular los flujos: ${result.errors?.join(', ')}`);
            }
        }
        return userRole === 'emisor'
            ? this.cashFlowModel.getEmisorView(bondId)
            : this.cashFlowModel.getInversionistaView(bondId);
    }

    async needsRecalculation(bondId: string): Promise<{ needsRecalc: boolean; reasons: string[]; }> {
        const reasons: string[] = [];
        const hasFlows = await this.cashFlowModel.hasFlows(bondId);
        if (!hasFlows) reasons.push('No existen flujos de caja calculados');

        const metricsCount = await this.prisma.financialMetrics.count({ where: { bondId } });
        if (metricsCount === 0) reasons.push('No existen métricas financieras calculadas');

        if (hasFlows) {
            const integrity = await this.cashFlowModel.validateFlowIntegrity(bondId);
            if (!integrity.isValid) reasons.push(`Flujos con errores: ${integrity.errors.join(', ')}`);
        }

        // ✅ VALIDACIÓN ADICIONAL: Verificar consistencia de series
        try {
            const bond = await this.bondModel.findById(bondId);
            if (bond) {
                const calculationInputs = await this.convertBondToCalculationInputs(bond);
                const numAnios = calculationInputs.numAnios;

                if (calculationInputs.inflacionSerie.length !== numAnios) {
                    reasons.push(`Serie de inflación inconsistente: ${calculationInputs.inflacionSerie.length} vs ${numAnios} años`);
                }

                if (calculationInputs.graciaSerie.length !== numAnios) {
                    reasons.push(`Serie de gracia inconsistente: ${calculationInputs.graciaSerie.length} vs ${numAnios} años`);
                }
            }
        } catch (error) {
            reasons.push('Error validando consistencia de series');
        }

        const bond = await this.prisma.bond.findUnique({ where: { id: bondId }, select: { updatedAt: true } });
        if (bond) {
            const latestCalculationSource = await this.prisma.calculationResult.findFirst({
                where: { bondId },
                select: { createdAt: true },
                orderBy: { createdAt: 'desc' },
            }) || await this.prisma.financialMetrics.findFirst({
                where: { bondId },
                select: { createdAt: true },
                orderBy: { createdAt: 'desc'}
            });

            if (latestCalculationSource && bond.updatedAt > latestCalculationSource.createdAt) {
                reasons.push('Bono modificado después del último cálculo');
            } else if (!latestCalculationSource && (hasFlows || metricsCount > 0)) {
                reasons.push('No se puede determinar la fecha del último cálculo, posible necesidad de recalcular.');
            }
        }
        return { needsRecalc: reasons.length > 0, reasons };
    }

    private async getExistingCalculation(bondId: string): Promise<BondCalculationResponse | null> {
        const [flowsCount, emisorMetrics, bonistaMetrics] = await Promise.all([
            this.prisma.cashFlow.count({ where: { bondId } }),
            this.prisma.financialMetrics.findUnique({
                where: { bondId_role: { bondId, role: MetricsRole.EMISOR } }
            }),
            this.prisma.financialMetrics.findUnique({
                where: { bondId_role: { bondId, role: MetricsRole.BONISTA } }
            }),
        ]);

        if (flowsCount > 0 && emisorMetrics && bonistaMetrics) {
            return {
                bondId, success: true, calculatedAt: emisorMetrics.fechaCalculo,
                metricas: {
                    emisor: {
                        precioActual: emisorMetrics.precioActual.toNumber(), van: emisorMetrics.van.toNumber(),
                        tceaEmisor: emisorMetrics.tcea?.toNumber() ?? 0,
                        tceaEmisorConEscudo: emisorMetrics.tceaConEscudo?.toNumber() ?? 0,
                        duracion: emisorMetrics.duracion.toNumber(),
                        duracionModificada: emisorMetrics.duracionModificada.toNumber(),
                        convexidad: emisorMetrics.convexidad.toNumber(),
                        totalRatiosDecision: emisorMetrics.totalRatiosDecision.toNumber(),
                    },
                    bonista: {
                        precioActual: bonistaMetrics.precioActual.toNumber(), van: bonistaMetrics.van.toNumber(),
                        treaBonista: bonistaMetrics.trea?.toNumber() ?? 0,
                        duracion: bonistaMetrics.duracion.toNumber(),
                        duracionModificada: bonistaMetrics.duracionModificada.toNumber(),
                        convexidad: bonistaMetrics.convexidad.toNumber(),
                        totalRatiosDecision: bonistaMetrics.totalRatiosDecision.toNumber(),
                    },
                },
                flowsCount,
            };
        }
        return null;
    }

    private async validateBondForCalculation(bond: BondWithFullRelations): Promise<void> {
        const errors: string[] = [];
        if (bond.valorNominal.isNegative() || bond.valorNominal.isZero()) errors.push('Valor nominal inválido');
        if (bond.valorComercial.isNegative() || bond.valorComercial.isZero()) errors.push('Valor comercial inválido');
        if (bond.numAnios <= 0) errors.push('Número de años inválido');
        if (bond.tasaAnual.isNegative()) errors.push('Tasa anual inválida');
        if (errors.length > 0) throw new Error(`Bono inválido para cálculo: ${errors.join(', ')}`);
    }

    private async convertBondToCalculationInputs(bond: BondWithFullRelations): Promise<CalculationInputs & {id: string}> {
        const calcInputsRecord = await this.prisma.calculationInputs.findUnique({
            where: { bondId: bond.id }
        });

        if (!bond.costs) throw new Error(`Costes no definidos para bono ${bond.id}`);
        if (!calcInputsRecord) throw new Error(`Registro CalculationInputs no encontrado para bono ${bond.id}`);

        const frecuenciaCuponMap: Record<string, FrequenciaCupon> = {
            MENSUAL: 'mensual', BIMESTRAL: 'bimestral', TRIMESTRAL: 'trimestral',
            CUATRIMESTRAL: 'cuatrimestral', SEMESTRAL: 'semestral', ANUAL: 'anual',
        };
        const tipoTasaMap: Record<string, 'efectiva' | 'nominal'> = {
            EFECTIVA: 'efectiva', NOMINAL: 'nominal',
        };

        const mappedFrecuenciaCupon = frecuenciaCuponMap[bond.frecuenciaCupon as keyof typeof frecuenciaCuponMap];
        const mappedTipoTasa = tipoTasaMap[bond.tipoTasa as keyof typeof tipoTasaMap];

        if (!mappedFrecuenciaCupon) throw new Error(`Frecuencia de cupón no mapeada: ${bond.frecuenciaCupon}`);
        if (!mappedTipoTasa) throw new Error(`Tipo de tasa no mapeado: ${bond.tipoTasa}`);

        // ✅ OBTENER SERIES DE LA BASE DE DATOS CON VALIDACIÓN ADICIONAL
        const rawInflacionSerie = calcInputsRecord.inflacionSerie;
        const rawGraciaSerie = calcInputsRecord.graciaSerie;

        console.log('🔍 Debug convertBondToCalculationInputs:', {
            bondId: bond.id,
            numAnios: bond.numAnios,
            rawInflacionSerie: {
                value: rawInflacionSerie,
                type: typeof rawInflacionSerie,
                isArray: Array.isArray(rawInflacionSerie),
                length: Array.isArray(rawInflacionSerie) ? rawInflacionSerie.length : 'N/A'
            },
            rawGraciaSerie: {
                value: rawGraciaSerie,
                type: typeof rawGraciaSerie,
                isArray: Array.isArray(rawGraciaSerie),
                length: Array.isArray(rawGraciaSerie) ? rawGraciaSerie.length : 'N/A'
            }
        });

        // ✅ VALIDACIÓN Y CONVERSIÓN SEGURA DE ARRAYS
        let inflacionSerie: number[];
        let graciaSerie: GracePeriodType[];

        // Validar y convertir inflacionSerie
        if (!Array.isArray(rawInflacionSerie)) {
            console.error(`❌ inflacionSerie no es array para bono ${bond.id}:`, rawInflacionSerie);
            throw new Error(`inflacionSerie must be an array for bond ${bond.id}. Got: ${typeof rawInflacionSerie}`);
        }

        inflacionSerie = rawInflacionSerie.map((item, index) => {
            if (typeof item !== 'number' || !isFinite(item)) {
                console.error(`❌ inflacionSerie[${index}] no es número válido:`, item);
                throw new Error(`inflacionSerie[${index}] must be a finite number. Got: ${item} (${typeof item})`);
            }
            return item;
        });

        // Validar y convertir graciaSerie
        if (!Array.isArray(rawGraciaSerie)) {
            console.error(`❌ graciaSerie no es array para bono ${bond.id}:`, rawGraciaSerie);
            throw new Error(`graciaSerie must be an array for bond ${bond.id}. Got: ${typeof rawGraciaSerie}`);
        }

        graciaSerie = rawGraciaSerie.map((item, index) => {
            if (!['S', 'P', 'T'].includes(item)) {
                console.error(`❌ graciaSerie[${index}] valor inválido:`, item);
                throw new Error(`graciaSerie[${index}] must be 'S', 'P', or 'T'. Got: ${item}`);
            }
            return item as GracePeriodType;
        });

        console.log('✅ Series validadas:', {
            inflacionSerie: { length: inflacionSerie.length, sample: inflacionSerie.slice(0, 3) },
            graciaSerie: { length: graciaSerie.length, sample: graciaSerie.slice(0, 3) }
        });

        const result = {
            id: calcInputsRecord.id,
            valorNominal: bond.valorNominal.toNumber(),
            valorComercial: bond.valorComercial.toNumber(),
            numAnios: bond.numAnios,
            frecuenciaCupon: mappedFrecuenciaCupon,
            diasPorAno: bond.baseDias as 360 | 365,
            tipoTasa: mappedTipoTasa,
            periodicidadCapitalizacion: bond.periodicidadCapitalizacion as any,
            tasaAnual: bond.tasaAnual.toNumber(),
            tasaDescuento: 0.045,
            impuestoRenta: bond.impuestoRenta.toNumber(),
            fechaEmision: bond.fechaEmision,
            primaPorcentaje: bond.primaVencimiento.toNumber(),
            estructuracionPorcentaje: bond.costs.estructuracionPct.toNumber(),
            colocacionPorcentaje: bond.costs.colocacionPct.toNumber(),
            flotacionPorcentaje: bond.costs.flotacionPct.toNumber(),
            cavaliPorcentaje: bond.costs.cavaliPct.toNumber(),
            inflacionSerie: inflacionSerie, // ✅ Array validado
            graciaSerie: graciaSerie,       // ✅ Array validado
        };

        console.log('✅ convertBondToCalculationInputs completado para bono:', bond.id);
        return result;
    }

    private async saveCalculationResults(
        bondId: string,
        calculationInputsId: string,
        result: CalculationResult
    ): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            if (result.flujos && result.flujos.length > 0) {
                const prismaFlowsData = result.flujos.map(flow => {
                    const data: Prisma.CashFlowCreateManyInput = {
                        bondId, periodo: flow.periodo, fecha: flow.fecha,
                        inflacionAnual: flow.inflacionAnual !== null ? new Decimal(flow.inflacionAnual) : null,
                        inflacionSemestral: flow.inflacionSemestral !== null ? new Decimal(flow.inflacionSemestral) : null,
                        periodoGracia: flow.gracia,
                        bonoCapital: flow.bonoCapital !== null ? new Decimal(flow.bonoCapital) : null,
                        bonoIndexado: flow.bonoIndexado !== null ? new Decimal(flow.bonoIndexado) : null,
                        cupon: flow.cupon !== null ? new Decimal(flow.cupon) : null,
                        amortizacion: flow.amortizacion !== null ? new Decimal(flow.amortizacion) : null,
                        cuota: flow.cuota !== null ? new Decimal(flow.cuota) : null,
                        prima: flow.prima !== null ? new Decimal(flow.prima) : null,
                        escudoFiscal: flow.escudoFiscal !== null ? new Decimal(flow.escudoFiscal) : null,
                        flujoEmisor: flow.flujoEmisor !== null ? new Decimal(flow.flujoEmisor) : null,
                        flujoEmisorConEscudo: flow.flujoEmisorConEscudo !== null ? new Decimal(flow.flujoEmisorConEscudo) : null,
                        flujoBonista: flow.flujoBonista !== null ? new Decimal(flow.flujoBonista) : null,
                        flujoActualizado: flow.flujoActualizado !== null ? new Decimal(flow.flujoActualizado) : null,
                        faPlazoPonderado: flow.faPlazoPonderado !== null ? new Decimal(flow.faPlazoPonderado) : null,
                        factorConvexidad: flow.factorConvexidad !== null ? new Decimal(flow.factorConvexidad) : null,
                    };
                    Object.keys(data).forEach(key => (data as any)[key] === undefined && delete (data as any)[key]);
                    return data;
                });
                await tx.cashFlow.deleteMany({where: {bondId}});
                await tx.cashFlow.createMany({ data: prismaFlowsData, skipDuplicates: true });
            }

            const commonMetricsCreatePayload = (metrics: CalculationResult['metricas']) => ({
                precioActual: metrics.precioActual,
                utilidadPerdida: metrics.utilidadPerdida,
                duracion: metrics.duracion,
                duracionModificada: metrics.duracionModificada,
                convexidad: metrics.convexidad,
                totalRatiosDecision: metrics.totalRatiosDecision,
                fechaCalculo: result.fechaCalculo || new Date(),
            });

            await tx.financialMetrics.upsert({
                where: { bondId_role: { bondId, role: MetricsRole.EMISOR } },
                create: {
                    bondId, role: MetricsRole.EMISOR,
                    ...commonMetricsCreatePayload(result.metricas),
                    van: result.metricas.utilidadPerdida,
                    tir: result.metricas.tceaEmisor,
                    tcea: result.metricas.tceaEmisor,
                    tceaConEscudo: result.metricas.tceaEmisorConEscudo,
                },
                update: {
                    ...commonMetricsCreatePayload(result.metricas),
                    van: result.metricas.utilidadPerdida,
                    tir: result.metricas.tceaEmisor,
                    tcea: result.metricas.tceaEmisor,
                    tceaConEscudo: result.metricas.tceaEmisorConEscudo,
                },
            });
            await tx.financialMetrics.upsert({
                where: { bondId_role: { bondId, role: MetricsRole.BONISTA } },
                create: {
                    bondId, role: MetricsRole.BONISTA,
                    ...commonMetricsCreatePayload(result.metricas),
                    van: result.metricas.precioActual,
                    tir: result.metricas.treaBonista,
                    trea: result.metricas.treaBonista,
                },
                update: {
                    ...commonMetricsCreatePayload(result.metricas),
                    van: result.metricas.precioActual,
                    tir: result.metricas.treaBonista,
                    trea: result.metricas.treaBonista,
                },
            });

            await tx.calculationResult.upsert({
                where: {
                    CalculationResult_bondId_calculationInputsId_key: {
                        bondId,
                        calculationInputsId
                    }
                },
                create: {
                    bond: { connect: { id: bondId } },
                    inputs: { connect: { id: calculationInputsId } },
                    calculosIntermedios: result.intermedios as unknown as Prisma.InputJsonValue || Prisma.JsonNull,
                    metricasCalculadas: result.metricas as unknown as Prisma.InputJsonValue || Prisma.JsonNull,
                },
                update: {
                    calculosIntermedios: result.intermedios as unknown as Prisma.InputJsonValue || Prisma.JsonNull,
                    metricasCalculadas: result.metricas as unknown as Prisma.InputJsonValue || Prisma.JsonNull,
                    createdAt: new Date(),
                }
            });
        });
    }

    private formatCalculationResponse(bondId: string, result: CalculationResult): BondCalculationResponse {
        return {
            bondId, success: true, calculatedAt: result.fechaCalculo,
            metricas: {
                emisor: {
                    precioActual: result.metricas.precioActual, van: result.metricas.utilidadPerdida,
                    tceaEmisor: result.metricas.tceaEmisor,
                    tceaEmisorConEscudo: result.metricas.tceaEmisorConEscudo,
                    duracion: result.metricas.duracion, duracionModificada: result.metricas.duracionModificada,
                    convexidad: result.metricas.convexidad, totalRatiosDecision: result.metricas.totalRatiosDecision,
                },
                bonista: {
                    precioActual: result.metricas.precioActual, van: result.metricas.precioActual,
                    treaBonista: result.metricas.treaBonista,
                    duracion: result.metricas.duracion, duracionModificada: result.metricas.duracionModificada,
                    convexidad: result.metricas.convexidad, totalRatiosDecision: result.metricas.totalRatiosDecision,
                },
            },
            flowsCount: result.flujos?.length || 0,
        };
    }

    private getEmptyMetrics() {
        const emptyBase = { precioActual: 0, van: 0, duracion: 0, duracionModificada: 0, convexidad: 0, totalRatiosDecision: 0 };
        return {
            emisor: { ...emptyBase, tceaEmisor: 0, tceaEmisorConEscudo: 0 },
            bonista: { ...emptyBase, treaBonista: 0 },
        };
    }
}