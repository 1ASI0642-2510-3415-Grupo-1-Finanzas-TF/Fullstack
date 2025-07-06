#!/usr/bin/env tsx

/**
 * Script para probar los endpoints de la API de inversores
 * 
 * Este script prueba:
 * 1. GET /api/inversionista/[inversionistaId]/investments
 * 2. GET /api/inversionista/available-bonds
 * 3. POST /api/inversionista/invest
 * 4. GET /api/inversionista/[inversionistaId]/dashboard-metrics
 */

// Cargar variables de entorno
import { config } from 'dotenv';
config({ path: '.env' });

import { PrismaClient } from '../lib/generated/client';

const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000';

async function testInvestorAPI() {
    console.log('🧪 Iniciando pruebas de la API de inversores...\n');

    try {
        // 1. Obtener un inversionista de prueba
        console.log('1️⃣ Buscando inversionista de prueba...');
        const inversionista = await prisma.inversionistaProfile.findFirst({
            select: { id: true, firstName: true, lastName: true, userId: true }
        });

        if (!inversionista) {
            console.log('❌ No se encontró ningún inversionista. Creando uno de prueba...');
            
            // Crear un usuario de prueba
            const user = await prisma.user.create({
                data: {
                    email: 'inversionista.test@example.com',
                    passwordHash: 'test-hash',
                    role: 'INVERSIONISTA',
                }
            });

            // Crear perfil de inversionista
            const newInversionista = await prisma.inversionistaProfile.create({
                data: {
                    userId: user.id,
                    firstName: 'Juan',
                    lastName: 'Pérez',
                    phone: '+51 999 888 777',
                    investmentProfile: 'CONSERVADOR',
                    riskTolerance: 0.3, // BAJA tolerancia al riesgo
                }
            });

            console.log('✅ Inversionista de prueba creado:', newInversionista.id);
            return;
        }

        console.log('✅ Inversionista encontrado:', `${inversionista.firstName} ${inversionista.lastName} (${inversionista.id})`);

        // 2. Probar endpoint de bonos disponibles
        console.log('\n2️⃣ Probando GET /api/inversionista/available-bonds...');
        const availableBondsResponse = await fetch(`${BASE_URL}/api/inversionista/available-bonds?limit=5`);
        
        if (availableBondsResponse.ok) {
            const availableBonds = await availableBondsResponse.json();
            console.log('✅ Bonos disponibles obtenidos:', availableBonds.bonds.length);
            console.log('   - Total de bonos:', availableBonds.metrics.totalBonds);
            console.log('   - Valor nominal total:', availableBonds.metrics.totalNominalValue.toLocaleString());
            console.log('   - Tasa promedio:', (availableBonds.metrics.averageRate * 100).toFixed(2) + '%');
        } else {
            console.log('❌ Error obteniendo bonos disponibles:', availableBondsResponse.status);
        }

        // 3. Probar endpoint de inversiones del inversionista
        console.log('\n3️⃣ Probando GET /api/inversionista/[inversionistaId]/investments...');
        const investmentsResponse = await fetch(`${BASE_URL}/api/inversionista/${inversionista.id}/investments`);
        
        if (investmentsResponse.ok) {
            const investments = await investmentsResponse.json();
            console.log('✅ Inversiones obtenidas:', investments.investments.length);
            console.log('   - Total invertido:', investments.metrics.totalInvested.toLocaleString());
            console.log('   - Inversiones activas:', investments.metrics.activeInvestments);
            console.log('   - Ganancia no realizada:', investments.metrics.totalUnrealizedGain.toLocaleString());
        } else {
            console.log('❌ Error obteniendo inversiones:', investmentsResponse.status);
        }

        // 4. Probar endpoint de métricas del dashboard
        console.log('\n4️⃣ Probando GET /api/inversionista/[inversionistaId]/dashboard-metrics...');
        const dashboardResponse = await fetch(`${BASE_URL}/api/inversionista/${inversionista.id}/dashboard-metrics`);
        
        if (dashboardResponse.ok) {
            const dashboard = await dashboardResponse.json();
            console.log('✅ Métricas del dashboard obtenidas');
            console.log('   - Total invertido:', dashboard.kpis.totalInvested.toLocaleString());
            console.log('   - Valor actual del portfolio:', dashboard.kpis.currentPortfolioValue.toLocaleString());
            console.log('   - Retorno del portfolio:', dashboard.kpis.portfolioReturn.toFixed(2) + '%');
            console.log('   - Inversiones activas:', dashboard.kpis.activeInvestments);
            console.log('   - Duración promedio:', dashboard.kpis.averageDuration.toFixed(2));
            console.log('   - Distribución por emisor:', dashboard.distribution.byEmisor.length);
        } else {
            console.log('❌ Error obteniendo métricas del dashboard:', dashboardResponse.status);
        }

        // 5. Probar endpoint de estadísticas de inversión
        console.log('\n5️⃣ Probando GET /api/inversionista/invest?inversionistaId=...');
        const statsResponse = await fetch(`${BASE_URL}/api/inversionista/invest?inversionistaId=${inversionista.id}`);
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('✅ Estadísticas de inversión obtenidas');
            console.log('   - Total de inversiones:', stats.stats.totalInvestments);
            console.log('   - Inversiones activas:', stats.stats.activeInvestments);
            console.log('   - Total invertido:', stats.stats.totalInvested.toLocaleString());
            console.log('   - Ganancia no realizada:', stats.stats.totalUnrealizedGain.toLocaleString());
        } else {
            console.log('❌ Error obteniendo estadísticas:', statsResponse.status);
        }

        // 6. Probar inversión en un bono (si hay bonos disponibles)
        if (availableBondsResponse.ok) {
            const availableBonds = await availableBondsResponse.json();
            
            if (availableBonds.bonds.length > 0) {
                const testBond = availableBonds.bonds[0];
                console.log('\n6️⃣ Probando POST /api/inversionista/invest...');
                console.log(`   - Bono seleccionado: ${testBond.name}`);
                console.log(`   - Emisor: ${testBond.emisor.companyName}`);
                
                const investResponse = await fetch(`${BASE_URL}/api/inversionista/invest`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inversionistaId: inversionista.id,
                        bondId: testBond.id,
                        montoInvertido: 10000, // $10,000
                        precioCompra: testBond.financialMetrics?.precioActual || 100,
                    }),
                });

                if (investResponse.ok) {
                    const investment = await investResponse.json();
                    console.log('✅ Inversión creada exitosamente');
                    console.log(`   - ID de inversión: ${investment.investment.id}`);
                    console.log(`   - Monto invertido: ${investment.investment.montoInvertido.toLocaleString()}`);
                    console.log(`   - Precio de compra: ${investment.investment.precioCompra}`);
                    console.log(`   - Mensaje: ${investment.message}`);
                } else {
                    const error = await investResponse.json();
                    console.log('❌ Error creando inversión:', error.error);
                    console.log('   - Código:', error.code);
                }
            } else {
                console.log('\n6️⃣ No hay bonos disponibles para probar inversión');
            }
        }

        console.log('\n🎉 Pruebas completadas exitosamente!');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar las pruebas
testInvestorAPI().catch(console.error); 