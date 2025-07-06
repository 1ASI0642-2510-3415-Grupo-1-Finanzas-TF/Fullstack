#!/usr/bin/env tsx
// scripts/diagnose.ts
import { PrismaClient } from '../lib/generated/client';
import { signToken, verifyToken } from '../lib/auth';

async function runDiagnosis() {
    console.log('🔍 Ejecutando diagnóstico del sistema...\n');

    // 1. Verificar variables de entorno
    console.log('1️⃣ Verificando variables de entorno...');
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    let envOk = true;

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            console.log(`❌ ${envVar} no está configurada`);
            envOk = false;
        } else {
            console.log(`✅ ${envVar} configurada`);
        }
    }

    if (!envOk) {
        console.log('\n❌ Faltan variables de entorno críticas');
        console.log('💡 Copia .env.example a .env y configura las variables');
        return;
    }

    // 2. Verificar conexión a la base de datos
    console.log('\n2️⃣ Verificando conexión a base de datos...');
    const prisma = new PrismaClient();

    try {
        await prisma.$connect();
        console.log('✅ Conexión a base de datos exitosa');

        // Verificar que las tablas existen
        const userCount = await prisma.user.count();
        console.log(`✅ Tabla 'user' accesible (${userCount} registros)`);

        const emisorCount = await prisma.emisorProfile.count();
        console.log(`✅ Tabla 'emisorProfile' accesible (${emisorCount} registros)`);

    } catch (error) {
        console.log('❌ Error conectando a base de datos:', error);
        console.log('💡 Ejecuta: createdb bonos_dev && pnpm exec prisma migrate dev');
        return;
    }

    // 3. Verificar autenticación
    console.log('\n3️⃣ Verificando sistema de autenticación...');
    try {
        const testPayload = { userId: 'test-user-id' };
        const token = await signToken(testPayload);
        const decoded = await verifyToken(token);

        if (decoded && decoded.userId === testPayload.userId) {
            console.log('✅ Sistema de tokens JWT funcionando');
        } else {
            console.log('❌ Error en sistema de tokens JWT');
        }
    } catch (error) {
        console.log('❌ Error en autenticación:', error);
    }

    // 4. Simular creación de perfil emisor
    console.log('\n4️⃣ Simulando creación de perfil emisor...');
    try {
        // Crear usuario de prueba
        const testUser = await prisma.user.upsert({
            where: { email: 'test@diagnose.com' },
            update: {},
            create: {
                email: 'test@diagnose.com',
                passwordHash: 'test-hash',
                role: 'EMISOR',
            }
        });

        // Intentar crear perfil emisor
        const testProfile = await prisma.emisorProfile.upsert({
            where: { userId: testUser.id },
            update: {},
            create: {
                userId: testUser.id,
                companyName: 'Test Company',
                ruc: '12345678901',
                contactPerson: 'Test Contact',
                industry: 'Test Industry',
                address: 'Test Address',
            }
        });

        console.log('✅ Creación de perfil emisor simulada exitosamente');

        // Limpiar datos de prueba
        await prisma.emisorProfile.delete({ where: { id: testProfile.id } });
        await prisma.user.delete({ where: { id: testUser.id } });
        console.log('✅ Datos de prueba limpiados');

    } catch (error) {
        console.log('❌ Error simulando creación de perfil:', error);
        console.log('💡 Revisa los campos requeridos en el schema de Prisma');
    }

    await prisma.$disconnect();
    console.log('\n🎉 Diagnóstico completado');
}

// Ejecutar diagnóstico
runDiagnosis().catch(console.error);