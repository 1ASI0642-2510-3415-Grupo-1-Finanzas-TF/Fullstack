// lib/services/calculations/FinancialCalculator.ts

import {
    CalculationInputs,
    CalculationResult,
    CalculosIntermedios,
    CashFlowPeriod,
    FinancialMetrics,
    ValidationResult,
    ValidationError,
    CalculatorOptions,
    PrecisionConfig
} from '@/lib/types/calculations';
import { ExcelFormulas } from './ExcelFormulas';
import { Decimal } from 'decimal.js';

/**
 * Motor principal de cálculos financieros
 * Orquesta todas las fórmulas del Excel y genera resultados completos
 */
export class FinancialCalculator {

    private options: Required<CalculatorOptions>;

    constructor(options: CalculatorOptions = {}) {
        this.options = {
            precision: {
                decimalPlaces: 6,
                roundingMode: Decimal.ROUND_HALF_UP,
                tolerance: 1e-8
            },
            validateInputs: true,
            includeIntermediateSteps: true,
            cacheResults: false,
            ...options
        };

        // Configurar precisión global de Decimal.js
        Decimal.set({
            precision: this.options.precision.decimalPlaces + 4, // Extra precision for calculations
            rounding: this.options.precision.roundingMode
        });
    }

    /**
     * Método principal: Calcula todos los flujos y métricas financieras
     */
    async calculate(inputs: CalculationInputs): Promise<CalculationResult> {
        // 1. Validar inputs si está habilitado
        if (this.options.validateInputs) {
            const validation = this.validateInputs(inputs);
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
            }
        }

        try {
            // 2. Calcular valores intermedios
            const intermedios = this.calcularValoresIntermedios(inputs);

            // 3. Generar tabla de flujos de caja
            const flujos = this.calcularFlujosDeCaja(inputs, intermedios);

            // 4. Calcular métricas financieras
            const metricas = this.calcularMetricasFinancieras(flujos, intermedios);

            // 5. Ensamblar resultado final
            const resultado: CalculationResult = {
                inputs,
                intermedios,
                flujos,
                metricas,
                fechaCalculo: new Date(),
                version: '1.0.0'
            };

            return resultado;

        } catch (error) {
            throw new Error(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * STEP 1: Cálculos intermedios (Sección L del Excel)
     */
    private calcularValoresIntermedios(inputs: CalculationInputs): CalculosIntermedios {
        // L4: Frecuencia del cupón en días
        const frecuenciaCuponDias = ExcelFormulas.frecuenciaCuponDias(inputs.frecuenciaCupon);

        // L5: Días de capitalización
        const diasCapitalizacion = ExcelFormulas.diasCapitalizacion(inputs.periodicidadCapitalizacion);

        // L6: Períodos por año
        const periodosPorAno = ExcelFormulas.periodosPorAno(inputs.diasPorAno, frecuenciaCuponDias);

        // L7: Total de períodos
        const totalPeriodos = ExcelFormulas.totalPeriodos(periodosPorAno, inputs.numAnios);

        // L8: Tasa efectiva anual
        const tasaEfectivaAnual = ExcelFormulas.tasaEfectivaAnual(
            inputs.tipoTasa,
            inputs.tasaAnual,
            inputs.diasPorAno,
            diasCapitalizacion
        );

        // L9: Tasa cupón periódica
        const tasaCuponPeriodica = ExcelFormulas.tasaCuponPeriodica(
            tasaEfectivaAnual,
            frecuenciaCuponDias,
            inputs.diasPorAno
        );

        // L10: Tasa descuento periódica
        const tasaDescuentoPeriodica = ExcelFormulas.tasaDescuentoPeriodica(
            inputs.tasaDescuento,
            frecuenciaCuponDias,
            inputs.diasPorAno
        );

        // L11: Costes iniciales Emisor
        const costesInicialesEmisor = ExcelFormulas.costesInicialesEmisor(
            inputs.estructuracionPorcentaje,
            inputs.colocacionPorcentaje,
            inputs.flotacionPorcentaje,
            inputs.cavaliPorcentaje,
            inputs.valorComercial
        );

        // L12: Costes iniciales Bonista
        const costesInicialesBonista = ExcelFormulas.costesInicialesBonista(
            inputs.flotacionPorcentaje,
            inputs.cavaliPorcentaje,
            inputs.valorComercial
        );

        return {
            frecuenciaCuponDias,
            diasCapitalizacion,
            periodosPorAno,
            totalPeriodos,
            tasaEfectivaAnual,
            tasaCuponPeriodica,
            tasaDescuentoPeriodica,
            costesInicialesEmisor,
            costesInicialesBonista,
            vpnFlujosBonista: 0 // Se calculará después
        };
    }

    /**
     * STEP 2: Cálculo de flujos de caja por período
     */
    private calcularFlujosDeCaja(
        inputs: CalculationInputs,
        intermedios: CalculosIntermedios
    ): CashFlowPeriod[] {
        const flujos: CashFlowPeriod[] = [];
        const totalPeriodos = Math.floor(intermedios.totalPeriodos);

        // Período 0 (inicial)
        flujos.push(this.calcularPeriodoInicial(inputs, intermedios));

        // Períodos 1 hasta totalPeriodos
        for (let periodo = 1; periodo <= totalPeriodos; periodo++) {
            const flujo = this.calcularPeriodo(periodo, inputs, intermedios, flujos);
            flujos.push(flujo);
        }

        return flujos;
    }

    /**
     * Cálculo del período 0 (inicial)
     */
    private calcularPeriodoInicial(
        inputs: CalculationInputs,
        intermedios: CalculosIntermedios
    ): CashFlowPeriod {
        // Flujo Emisor en período 0
        const flujoEmisor = ExcelFormulas.flujoEmisor(
            0,
            inputs.valorComercial,
            intermedios.costesInicialesEmisor,
            intermedios.totalPeriodos,
            0, // cuota
            0  // prima
        );

        return {
            periodo: 0,
            fecha: inputs.fechaEmision,
            inflacionAnual: null,
            inflacionSemestral: null,
            gracia: null,
            bonoCapital: null,
            bonoIndexado: null,
            cupon: null,
            amortizacion: null,
            cuota: null,
            prima: null,
            escudoFiscal: null,
            flujoEmisor,
            flujoEmisorConEscudo: flujoEmisor, // Sin escudo en período 0
            flujoBonista: ExcelFormulas.flujoBonista(flujoEmisor),
            flujoActualizado: ExcelFormulas.flujoBonista(flujoEmisor), // No se descuenta período 0
            faPlazoPonderado: 0, // Período 0 no contribuye a duración
            factorConvexidad: 0  // Período 0 no contribuye a convexidad
        };
    }

    private calcularPeriodo(
        periodo: number,
        inputs: CalculationInputs,
        intermedios: CalculosIntermedios,
        flujosAnteriores: CashFlowPeriod[]
    ): CashFlowPeriod {
        // CORRECCIÓN: Mapeo correcto de series anuales a períodos de pago
        // Para frecuencia semestral: períodos 1-2 = año 1, períodos 3-4 = año 2, etc.
        const anoCorrespondiente = Math.floor((periodo - 1) / intermedios.periodosPorAno);

        // Obtener datos del período usando el año correspondiente
        const inflacionAnual = inputs.inflacionSerie[anoCorrespondiente] || 0;
        const gracia = inputs.graciaSerie[anoCorrespondiente] || 'S';

        // B[n]: Fecha del período
        const fecha = ExcelFormulas.fechaPeriodo(
            inputs.fechaEmision,
            periodo,
            intermedios.frecuenciaCuponDias
        );

        // D[n]: Inflación semestral
        const inflacionSemestral = ExcelFormulas.inflacionSemestral(
            periodo,
            intermedios.totalPeriodos,
            inflacionAnual,
            intermedios.frecuenciaCuponDias,
            inputs.diasPorAno
        );

        // F[n]: Bono capital (necesita datos del período anterior)
        const flujoAnterior = flujosAnteriores[periodo - 1];
        const bonoCapital = ExcelFormulas.bonoCapital(
            periodo,
            inputs.valorNominal,
            intermedios.totalPeriodos,
            flujoAnterior?.bonoIndexado || null,
            flujoAnterior?.cupon || null,
            flujoAnterior?.amortizacion || null,
            flujoAnterior?.gracia || null
        );

        // G[n]: Bono indexado
        const bonoIndexado = ExcelFormulas.bonoIndexado(bonoCapital, inflacionSemestral);

        // H[n]: Cupón (siempre se calcula)
        const cupon = ExcelFormulas.cupon(bonoIndexado, intermedios.tasaCuponPeriodica);

        // J[n]: Amortización (depende del tipo de gracia)
        const amortizacion = ExcelFormulas.amortizacion(
            periodo,
            intermedios.totalPeriodos,
            gracia,
            bonoIndexado
        );

        // I[n]: Cuota (la clave está aquí - debe ser 0 para gracia total)
        const cuota = ExcelFormulas.cuota(
            periodo,
            intermedios.totalPeriodos,
            gracia,
            cupon,
            amortizacion
        );

        // K[n]: Prima
        const prima = ExcelFormulas.prima(
            periodo,
            intermedios.totalPeriodos,
            inputs.primaPorcentaje,
            bonoIndexado //Cuando hay PGT: Los intereses se capitalizan formando un nuevo capital indexado: Capital * (1 + TEP)
        );

        // L[n]: Escudo fiscal
        const escudoFiscal = ExcelFormulas.escudoFiscal(cupon, inputs.impuestoRenta);

        // M[n]: Flujo Emisor
        const flujoEmisor = ExcelFormulas.flujoEmisor(
            periodo,
            inputs.valorComercial,
            intermedios.costesInicialesEmisor,
            intermedios.totalPeriodos,
            cuota,
            prima
        );

        // N[n]: Flujo Emisor con Escudo
        const flujoEmisorConEscudo = ExcelFormulas.flujoEmisorConEscudo(flujoEmisor, escudoFiscal);

        // O[n]: Flujo Bonista
        const flujoBonista = ExcelFormulas.flujoBonista(flujoEmisor);

        // P[n]: Flujo Actualizado
        const flujoActualizado = ExcelFormulas.flujoActualizado(
            flujoBonista,
            intermedios.tasaDescuentoPeriodica,
            periodo
        );

        // Q[n]: FA × Plazo
        const faPlazoPonderado = ExcelFormulas.faPlazoPonderado(
            flujoActualizado,
            periodo,
            intermedios.frecuenciaCuponDias,
            inputs.diasPorAno
        );

        // R[n]: Factor de Convexidad
        const factorConvexidad = ExcelFormulas.factorConvexidad(flujoActualizado, periodo);

        return {
            periodo,
            fecha,
            inflacionAnual,
            inflacionSemestral,
            gracia,
            bonoCapital,
            bonoIndexado,
            cupon,
            amortizacion,
            cuota,
            prima,
            escudoFiscal,
            flujoEmisor,
            flujoEmisorConEscudo,
            flujoBonista,
            flujoActualizado,
            faPlazoPonderado,
            factorConvexidad
        };
    }


    /**
     * STEP 3: Cálculo de métricas financieras finales
     */
    private calcularMetricasFinancieras(
        flujos: CashFlowPeriod[],
        intermedios: CalculosIntermedios
    ): FinancialMetrics {
        // Extraer arrays para cálculos
        const flujosBonista = flujos.map(f => f.flujoBonista || 0);
        const flujosEmisor = flujos.map(f => f.flujoEmisor || 0);
        const flujosEmisorConEscudo = flujos.map(f => f.flujoEmisorConEscudo || 0);
        const flujosActualizados = flujos.map(f => f.flujoActualizado || 0);
        const faPlazos = flujos.map(f => f.faPlazoPonderado || 0);
        const factoresConvexidad = flujos.map(f => f.factorConvexidad || 0);
        const fechas = flujos.map(f => f.fecha);

        // Precio Actual (VNA)
        const precioActual = ExcelFormulas.precioActual(
            flujosBonista,
            intermedios.tasaDescuentoPeriodica
        );

        // Utilidad/Pérdida
        const utilidadPerdida = new Decimal(flujosBonista[0] || 0)
            .plus(precioActual)
            .toNumber();

        // Duración
        const duracion = ExcelFormulas.duracion(faPlazos, flujosActualizados);

        // Convexidad
        const convexidad = ExcelFormulas.convexidad(
            factoresConvexidad,
            flujosActualizados,
            intermedios.tasaDescuentoPeriodica,
            360, // Usar valor fijo del Excel
            intermedios.frecuenciaCuponDias
        );

        // Total Ratios Decisión
        const totalRatiosDecision = new Decimal(duracion).plus(convexidad).toNumber();

        // Duración Modificada
        const duracionModificada = ExcelFormulas.duracionModificada(
            duracion,
            intermedios.tasaDescuentoPeriodica
        );

        // TCEAs y TREA
        const tceaEmisor = ExcelFormulas.tceaTrea(
            flujosEmisor,
            fechas,
            360,
            intermedios.frecuenciaCuponDias
        );

        const tceaEmisorConEscudo = ExcelFormulas.tceaTrea(
            flujosEmisorConEscudo,
            fechas,
            360,
            intermedios.frecuenciaCuponDias
        );

        const treaBonista = ExcelFormulas.tceaTrea(
            flujosBonista,
            fechas,
            360,
            intermedios.frecuenciaCuponDias
        );

        return {
            precioActual,
            utilidadPerdida,
            duracion,
            convexidad,
            totalRatiosDecision,
            duracionModificada,
            tceaEmisor,
            tceaEmisorConEscudo,
            treaBonista
        };
    }

    /**
     * Validación de inputs
     */
    private validateInputs(inputs: CalculationInputs): ValidationResult {
        const errors: ValidationError[] = [];

        // Validar valores positivos
        if (inputs.valorNominal <= 0) {
            errors.push({
                field: 'valorNominal',
                message: 'El valor nominal debe ser mayor que 0',
                code: 'INVALID_NOMINAL_VALUE'
            });
        }

        if (inputs.valorComercial <= 0) {
            errors.push({
                field: 'valorComercial',
                message: 'El valor comercial debe ser mayor que 0',
                code: 'INVALID_COMMERCIAL_VALUE'
            });
        }

        if (inputs.numAnios <= 0) {
            errors.push({
                field: 'numAnios',
                message: 'El número de años debe ser mayor que 0',
                code: 'INVALID_YEARS'
            });
        }

        // Validar tasas (entre 0% y 100%)
        if (inputs.tasaAnual < 0 || inputs.tasaAnual > 1) {
            errors.push({
                field: 'tasaAnual',
                message: 'La tasa anual debe estar entre 0% y 100%',
                code: 'INVALID_ANNUAL_RATE'
            });
        }

        if (inputs.tasaDescuento < 0 || inputs.tasaDescuento > 1) {
            errors.push({
                field: 'tasaDescuento',
                message: 'La tasa de descuento debe estar entre 0% y 100%',
                code: 'INVALID_DISCOUNT_RATE'
            });
        }

        // Validar series
        if (inputs.inflacionSerie.length !== inputs.numAnios) {
            errors.push({
                field: 'inflacionSerie',
                message: `La serie de inflación debe tener ${inputs.numAnios} elementos (recibidos ${inputs.inflacionSerie.length})`,
                code: 'INVALID_INFLATION_SERIES_LENGTH'
            });
        }

        if (inputs.graciaSerie.length !== inputs.numAnios) {
            errors.push({
                field: 'graciaSerie',
                message: `La serie de gracia debe tener ${inputs.numAnios} elementos (recibidos ${inputs.graciaSerie.length})`,
                code: 'INVALID_GRACE_SERIES_LENGTH'
            });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Método de utilidad para obtener solo las métricas principales
     */
    async calculateQuickMetrics(inputs: CalculationInputs): Promise<FinancialMetrics> {
        const result = await this.calculate(inputs);
        return result.metricas;
    }

    /**
     * Método para recalcular solo los flujos (útil para updates incrementales)
     */
    async recalculateFlows(
        inputs: CalculationInputs,
        intermedios: CalculosIntermedios
    ): Promise<CashFlowPeriod[]> {
        return this.calcularFlujosDeCaja(inputs, intermedios);
    }
}