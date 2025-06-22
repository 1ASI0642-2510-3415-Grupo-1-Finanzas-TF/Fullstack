-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('EMISOR', 'INVERSIONISTA');

-- CreateEnum
CREATE TYPE "bond_status" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "frecuencia_cupon" AS ENUM ('MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'CUATRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "tipo_tasa" AS ENUM ('EFECTIVA', 'NOMINAL');

-- CreateEnum
CREATE TYPE "metrics_role" AS ENUM ('EMISOR', 'BONISTA');

-- CreateEnum
CREATE TYPE "investment_status" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emisor_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "industry" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emisor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inversionista_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "investment_profile" TEXT NOT NULL,
    "risk_tolerance" DECIMAL(3,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inversionista_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonds" (
    "id" TEXT NOT NULL,
    "emisor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "codigo_isin" TEXT,
    "status" "bond_status" NOT NULL DEFAULT 'DRAFT',
    "valor_nominal" DECIMAL(20,4) NOT NULL,
    "valor_comercial" DECIMAL(20,4) NOT NULL,
    "num_anios" INTEGER NOT NULL,
    "fecha_emision" DATE NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "frecuencia_cupon" "frecuencia_cupon" NOT NULL,
    "base_dias" INTEGER NOT NULL,
    "tipo_tasa" "tipo_tasa" NOT NULL,
    "periodicidad_capitalizacion" TEXT NOT NULL,
    "tasa_anual" DECIMAL(8,6) NOT NULL,
    "indexado_inflacion" BOOLEAN NOT NULL DEFAULT false,
    "inflacion_anual" DECIMAL(6,4),
    "prima_vencimiento" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "impuesto_renta" DECIMAL(4,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bonds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bond_costs" (
    "id" TEXT NOT NULL,
    "bond_id" TEXT NOT NULL,
    "estructuracion_pct" DECIMAL(6,4) NOT NULL,
    "colocacion_pct" DECIMAL(6,4) NOT NULL,
    "flotacion_pct" DECIMAL(6,4) NOT NULL,
    "cavali_pct" DECIMAL(6,4) NOT NULL,
    "emisor_total_abs" DECIMAL(20,4) NOT NULL,
    "bonista_total_abs" DECIMAL(20,4) NOT NULL,
    "total_costs_abs" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bond_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flows" (
    "id" TEXT NOT NULL,
    "bond_id" TEXT NOT NULL,
    "periodo" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "inflacion_anual" DECIMAL(8,6),
    "inflacion_semestral" DECIMAL(8,6),
    "periodo_gracia" TEXT,
    "bono_capital" DECIMAL(20,4),
    "bono_indexado" DECIMAL(20,4),
    "cupon" DECIMAL(20,4),
    "amortizacion" DECIMAL(20,4),
    "cuota" DECIMAL(20,4),
    "prima" DECIMAL(20,4),
    "escudo_fiscal" DECIMAL(20,4),
    "flujo_emisor" DECIMAL(20,4),
    "flujo_emisor_con_escudo" DECIMAL(20,4),
    "flujo_bonista" DECIMAL(20,4),
    "flujo_actualizado" DECIMAL(20,4),
    "fa_plazo_ponderado" DECIMAL(20,6),
    "factor_convexidad" DECIMAL(20,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_metrics" (
    "id" TEXT NOT NULL,
    "bond_id" TEXT NOT NULL,
    "role" "metrics_role" NOT NULL,
    "precio_actual" DECIMAL(20,4) NOT NULL,
    "utilidad_perdida" DECIMAL(20,4) NOT NULL,
    "van" DECIMAL(20,4) NOT NULL,
    "duracion" DECIMAL(8,4) NOT NULL,
    "duracion_modificada" DECIMAL(8,4) NOT NULL,
    "convexidad" DECIMAL(8,4) NOT NULL,
    "total_ratios_decision" DECIMAL(8,4) NOT NULL,
    "tir" DECIMAL(8,6) NOT NULL,
    "tcea" DECIMAL(8,6),
    "tcea_con_escudo" DECIMAL(8,6),
    "trea" DECIMAL(8,6),
    "fecha_calculo" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_investments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bond_id" TEXT NOT NULL,
    "monto_invertido" DECIMAL(20,4) NOT NULL,
    "fecha_inversion" DATE NOT NULL,
    "precio_compra" DECIMAL(15,6) NOT NULL,
    "status" "investment_status" NOT NULL DEFAULT 'ACTIVE',
    "ganancia_no_realizada" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "rendimiento_actual" DECIMAL(8,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_inputs" (
    "id" TEXT NOT NULL,
    "bond_id" TEXT NOT NULL,
    "inputs_data" JSONB NOT NULL,
    "inflacion_serie" JSONB NOT NULL,
    "gracia_serie" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculation_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_results" (
    "id" TEXT NOT NULL,
    "bond_id" TEXT NOT NULL,
    "calculation_inputs_id" TEXT NOT NULL,
    "calculos_intermedios" JSONB NOT NULL,
    "metricas_calculadas" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" "audit_action" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "emisor_profiles_user_id_key" ON "emisor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "emisor_profiles_ruc_key" ON "emisor_profiles"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "inversionista_profiles_user_id_key" ON "inversionista_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bonds_codigo_isin_key" ON "bonds"("codigo_isin");

-- CreateIndex
CREATE UNIQUE INDEX "bond_costs_bond_id_key" ON "bond_costs"("bond_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_flows_bond_id_periodo_key" ON "cash_flows"("bond_id", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "financial_metrics_bond_id_role_key" ON "financial_metrics"("bond_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_investments_user_id_bond_id_key" ON "user_investments"("user_id", "bond_id");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_inputs_bond_id_key" ON "calculation_inputs"("bond_id");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_result_bondid_calculationinputsid_unique" ON "calculation_results"("bond_id", "calculation_inputs_id");

-- AddForeignKey
ALTER TABLE "emisor_profiles" ADD CONSTRAINT "emisor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inversionista_profiles" ADD CONSTRAINT "inversionista_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonds" ADD CONSTRAINT "bonds_emisor_id_fkey" FOREIGN KEY ("emisor_id") REFERENCES "emisor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bond_costs" ADD CONSTRAINT "bond_costs_bond_id_fkey" FOREIGN KEY ("bond_id") REFERENCES "bonds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_bond_id_fkey" FOREIGN KEY ("bond_id") REFERENCES "bonds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_metrics" ADD CONSTRAINT "financial_metrics_bond_id_fkey" FOREIGN KEY ("bond_id") REFERENCES "bonds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_investments" ADD CONSTRAINT "user_investment_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_investments" ADD CONSTRAINT "user_investment_bond_fk" FOREIGN KEY ("bond_id") REFERENCES "bonds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_investments" ADD CONSTRAINT "user_investment_inversionista_profile_fk" FOREIGN KEY ("user_id") REFERENCES "inversionista_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_inputs" ADD CONSTRAINT "calculation_inputs_bond_id_fkey" FOREIGN KEY ("bond_id") REFERENCES "bonds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_results" ADD CONSTRAINT "calculation_results_bond_id_fkey" FOREIGN KEY ("bond_id") REFERENCES "bonds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_results" ADD CONSTRAINT "calculation_results_calculation_inputs_id_fkey" FOREIGN KEY ("calculation_inputs_id") REFERENCES "calculation_inputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
