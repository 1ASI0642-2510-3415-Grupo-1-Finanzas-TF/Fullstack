#!/usr/bin/env tsx
// scripts/setup.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { createInterface } from 'readline';

/**
 * Script de configuración automática para el sistema de bonos
 * Configura base de datos, variables de entorno, dependencias y ejecuta tests
 */

const execAsync = promisify(exec);

interface SetupConfig {
    dbHost: string;
    dbPort: string;
    dbUser: string;
    dbPassword: string;
    dbName: string;
    dbTestName: string;
    nodeEnv: string;
    skipDB: boolean;
    skipTests: boolean;
    autoMode: boolean;
}

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function main() {
    console.log(`
🧮 SISTEMA DE BONOS - CONFIGURACIÓN AUTOMÁTICA (con pnpm)
═══════════════════════════════════════════════════════════

Este script configurará automáticamente:
✅ Variables de entorno
✅ Base de datos PostgreSQL  
✅ Dependencias (usando pnpm)
✅ Migraciones y seeds (usando Prisma con pnpm)
✅ Tests de validación

`);

    try {
        const config = await parseArguments();
        await checkSystemRequirements();
        await setupEnvironmentVariables(config);
        await installDependencies(); // Usará pnpm

        if (!config.skipDB) {
            await setupDatabase(config); // Usará pnpm para comandos Prisma
        }

        if (!config.skipTests) {
            await runTests(); // Usará pnpm para ejecutar tests
        }

        await finalSetup(); // Usará pnpm para comandos Prisma y type-check

        console.log(`
🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!

Próximos pasos:
1. Ejecutar: pnpm dev
2. Abrir: http://localhost:3000
3. Revisar: README.md para más información

Para calcular bonos:
- POST /api/bonds/{id}/calculate
- Usar hooks: useCalculations, useCashFlows

¡Listo para calcular bonos financieros! 🚀
`);

    } catch (error) {
        console.error('\n❌ Error durante la configuración:', error);
        // Verificamos si el error es una instancia de Error para acceder a 'message'
        if (error instanceof Error) {
            console.error('Detalles:', error.message);
            if (error.stack) {
                // console.error('Stack:', error.stack); // Descomentar para más detalle
            }
        }
        console.log('\n🔧 Para ayuda, ejecute: pnpm run setup -- --help');
        process.exit(1);
    } finally {
        rl.close();
    }
}

async function parseArguments(): Promise<SetupConfig> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Uso: pnpm run setup [opciones]

Opciones:
  --auto                Configuración automática con valores por defecto
  --skip-db             Omitir configuración de base de datos
  --skip-tests          Omitir ejecución de tests
  --db-host=HOST        Host de PostgreSQL (default: localhost)
  --db-port=PORT        Puerto de PostgreSQL (default: 5432)
  --db-user=USER        Usuario de PostgreSQL (default: postgres)
  --db-password=PASS    Password de PostgreSQL (default: password en modo auto)
  --db-name=NAME        Nombre de BD principal (default: bonos_dev)
  --db-test=NAME        Nombre de BD de test (default: bonos_test)
  --env=ENV             Entorno (development/production, default: development)
  --help, -h            Mostrar esta ayuda

Ejemplos:
  pnpm run setup                                    # Configuración interactiva
  pnpm run setup -- --auto                         # Configuración automática
  pnpm run setup -- --skip-db --skip-tests         # Solo configurar entorno
  pnpm run setup -- --db-password=mipassword       # Con password específico
    `);
        process.exit(0);
    }

    const autoMode = args.includes('--auto');

    if (autoMode) {
        console.log('🤖 Modo automático activado - usando valores por defecto...\n');
        return {
            dbHost: getArgValue(args, '--db-host') || 'localhost',
            dbPort: getArgValue(args, '--db-port') || '5432',
            dbUser: getArgValue(args, '--db-user') || 'postgres',
            dbPassword: getArgValue(args, '--db-password') || 'password', // Default password for auto mode
            dbName: getArgValue(args, '--db-name') || 'bonos_dev',
            dbTestName: getArgValue(args, '--db-test') || 'bonos_test',
            nodeEnv: getArgValue(args, '--env') || 'development',
            skipDB: args.includes('--skip-db'),
            skipTests: args.includes('--skip-tests'),
            autoMode: true,
        };
    }

    console.log('📝 Configuración interactiva - responda las siguientes preguntas:\n');
    const dbHost = await ask('Host de PostgreSQL (localhost): ') || 'localhost';
    const dbPort = await ask('Puerto de PostgreSQL (5432): ') || '5432';
    const dbUser = await ask('Usuario de PostgreSQL (postgres): ') || 'postgres';
    const dbPassword = await ask('Password de PostgreSQL: '); // No default in interactive for password
    const dbName = await ask('Nombre de BD principal (bonos_dev): ') || 'bonos_dev';
    const dbTestName = await ask('Nombre de BD de test (bonos_test): ') || 'bonos_test';

    return {
        dbHost, dbPort, dbUser, dbPassword, dbName, dbTestName,
        nodeEnv: 'development',
        skipDB: args.includes('--skip-db'),
        skipTests: args.includes('--skip-tests'),
        autoMode: false,
    };
}

function getArgValue(args: string[], key: string): string | undefined {
    const arg = args.find(a => a.startsWith(`${key}=`));
    return arg?.split('=')[1];
}

async function checkSystemRequirements() {
    console.log('🔍 Verificando requisitos del sistema...\n');
    try {
        const { stdout: nodeVersion } = await execAsync('node --version');
        const nodeMajor = parseInt(nodeVersion.replace('v', '').split('.')[0]);
        if (nodeMajor < 18) { // Ajusta según los requisitos reales de tu proyecto
            throw new Error(`Node.js 18+ requerido, encontrado: ${nodeVersion.trim()}`);
        }
        console.log(`✅ Node.js: ${nodeVersion.trim()}`);

        const { stdout: pnpmVersion } = await execAsync('pnpm --version');
        console.log(`✅ pnpm: ${pnpmVersion.trim()}`);

        try {
            const { stdout: pgVersion } = await execAsync('psql --version');
            console.log(`✅ PostgreSQL: ${pgVersion.trim().split('\n')[0]}`); // Tomar solo la primera línea
        } catch (error) {
            console.warn('⚠️ PostgreSQL (psql CLI) no encontrado en PATH. Asegúrate de que el servidor PostgreSQL esté accesible.');
            if (!process.argv.includes('--auto')) { // Solo preguntar en modo interactivo
                const continuar = await ask('¿Continuar sin verificar psql CLI? (y/N): ');
                if (continuar.toLowerCase() !== 'y') {
                    throw new Error('PostgreSQL es requerido para el sistema.');
                }
            }
        }

        try {
            const { stdout: tsVersion } = await execAsync('pnpm exec tsc --version');
            console.log(`✅ TypeScript: ${tsVersion.trim()}`);
        } catch (error) {
            console.warn('📦 TypeScript se verificará/instalará con las dependencias.');
        }
        console.log('');
    } catch (error) {
        throw new Error(`Requisitos no cumplidos: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function setupEnvironmentVariables(config: SetupConfig) {
    console.log('⚙️ Configurando variables de entorno (.env)...\n');
    const envLocalPath = '.env';
    const envExamplePath = '.env.example';

    try {
        try {
            await fs.access(envLocalPath);
            if (!config.autoMode) {
                const overwrite = await ask(`⚠️ ${envLocalPath} ya existe. ¿Sobrescribir? (y/N): `);
                if (overwrite.toLowerCase() !== 'y') {
                    console.log(`📝 Manteniendo ${envLocalPath} existente.`);
                    return;
                }
            }
            console.log(`ℹ️ ${envLocalPath} existente será sobrescrito (o usado si no se sobrescribe).`);
        } catch { /* .env no existe, continuar */ }

        // Usar `config.dbPassword` que ya maneja el default para autoMode o el input interactivo
        const databaseUrl = `postgresql://${config.dbUser}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbName}?schema=public`;
        const testDatabaseUrl = `postgresql://${config.dbUser}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbTestName}?schema=public`;

        const envContent = `# Configuración generada automáticamente por scripts/setup.ts
# ${new Date().toISOString()}

DATABASE_URL="${databaseUrl}"
DATABASE_TEST_URL="${testDatabaseUrl}"
DB_HOST="${config.dbHost}"
DB_PORT="${config.dbPort}"
DB_NAME="${config.dbName}"
DB_TEST_NAME="${config.dbTestName}" # Añadido para referencia
DB_USER="${config.dbUser}"
DB_PASSWORD="${config.dbPassword}" # Importante: esto guardará la contraseña en el .env

NODE_ENV="${config.nodeEnv}"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-${Math.random().toString(36).slice(2)}" # Un poco más aleatorio

JWT_SECRET="jwt-secret-${Math.random().toString(36).slice(2)}"
JWT_EXPIRES_IN="24h"
SECURE_COOKIE=false

# ... (otras variables que quieras generar o tomar de .env.example) ...
# Considera leer .env.example y solo añadir/sobrescribir las de BD
# para no perder otras configuraciones manuales que el usuario pueda tener.
`;
        await fs.writeFile(envLocalPath, envContent);
        console.log(`✅ ${envLocalPath} creado/actualizado exitosamente.`);

        try {
            await fs.access(envExamplePath);
            console.log(`✅ ${envExamplePath} encontrado.`);
        } catch {
            console.warn(`⚠️ ${envExamplePath} no encontrado. Se recomienda tener uno en el proyecto.`);
        }
        console.log('');
    } catch (error) {
        throw new Error(`Error configurando variables de entorno: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function installDependencies() {
    console.log('📦 Instalando dependencias (usando pnpm)...\n');
    try {
        await fs.access('package.json');
        console.log('📥 Ejecutando `pnpm install`...');
        // No es necesario especificar maxBuffer tan grande para pnpm install usualmente
        const { stdout, stderr } = await execAsync('pnpm install');
        if (stderr) console.warn('⚠️ Salida de stderr durante `pnpm install` (puede incluir warnings):', stderr);
        console.log(stdout); // Mostrar salida de pnpm install
        console.log('✅ Dependencias instaladas exitosamente.\n');

        // Verificar dependencias críticas (opcional, pnpm ya lo hace)
        // ...
    } catch (error) {
        throw new Error(`Error instalando dependencias: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function setupDatabase(config: SetupConfig) {
    console.log('🗄️ Configurando base de datos (usando pnpm y Prisma)...\n');
    try {
        const PGPASSWORD = config.dbPassword; // Para que `createdb` no pida contraseña si el usuario lo requiere

        const createDbCommand = (dbName: string) =>
            `createdb -h "${config.dbHost}" -p "${config.dbPort}" -U "${config.dbUser}" "${dbName}"`;

        console.log(`📊 Creando base de datos de desarrollo: ${config.dbName}...`);
        try {
            await execAsync(createDbCommand(config.dbName), { env: { ...process.env, PGPASSWORD } });
            console.log(`✅ Base de datos ${config.dbName} creada.`);
        } catch (e: any) {
            if (e.stderr?.includes('already exists') || e.message?.includes('already exists')) {
                console.log(`ℹ️ Base de datos ${config.dbName} ya existe.`);
            } else {
                console.warn(`⚠️ Error creando ${config.dbName}. Puede que ya exista o falten permisos. Error: ${e.stderr || e.message}`);
            }
        }

        console.log(`📊 Creando base de datos de test: ${config.dbTestName}...`);
        try {
            await execAsync(createDbCommand(config.dbTestName), { env: { ...process.env, PGPASSWORD } });
            console.log(`✅ Base de datos ${config.dbTestName} creada.`);
        } catch (e: any) {
            if (e.stderr?.includes('already exists') || e.message?.includes('already exists')) {
                console.log(`ℹ️ Base de datos ${config.dbTestName} ya existe.`);
            } else {
                console.warn(`⚠️ Error creando ${config.dbTestName}. Puede que ya exista o falten permisos. Error: ${e.stderr || e.message}`);
            }
        }

        // Forzar carga de .env recién creado para los comandos de Prisma
        // Esto es un hack. Sería mejor que Prisma CLI lo leyera directamente o usar dotenv-cli
        // Pero dado que este script acaba de crear/actualizar .env, intentamos cargarlo.
        // Alternativamente, podrías requerir que el usuario lo cargue o reinicie la terminal.
        // Por simplicidad, continuamos asumiendo que Prisma CLI puede encontrar DATABASE_URL.

        console.log('\n⚙️ Generando cliente de Prisma...');
        await execAsync('pnpm exec prisma generate');
        console.log('✅ Cliente de Prisma generado.');

        console.log('\n📈 Aplicando migraciones (usando `prisma migrate dev`)...');
        // `migrate dev` es interactivo. Para un script, `db push` (prototipo) o `migrate deploy` (prod) son mejores.
        // Vamos a usar `db push` para un setup más rápido y no interactivo, asumiendo desarrollo.
        // Para un setup robusto, se usaría `migrate deploy` después de generar migraciones con `migrate dev`.
        // ¡OJO! `db push` no usa archivos de migración y puede perder datos si el esquema cambia drásticamente.
        // Para un primer setup en desarrollo, suele estar bien.
        // await execAsync('pnpm exec prisma db push --skip-generate'); // --skip-generate porque ya lo hicimos
        // O, si prefieres mantener las migraciones:
        console.log('   (Esto creará una nueva migración si es la primera vez o hay cambios en el schema)');
        await execAsync('pnpm exec prisma migrate dev --name setup_initial_schema --skip-seed --skip-generate');

        console.log('✅ Migraciones aplicadas.');

        console.log('\n🌱 Insertando datos de ejemplo (usando `pnpm db:seed`)...');
        // Asumimos que tienes un script "db:seed" en tu package.json
        // que ejecuta algo como "tsx prisma/seed.ts"
        await execAsync('pnpm db:seed');
        console.log('✅ Datos de ejemplo insertados.');

        console.log('');
    } catch (error) {
        throw new Error(`Error configurando base de datos: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function runTests() {
    console.log('🧪 Ejecutando tests de validación (usando pnpm)...\n');
    try {
        console.log('🧮 Tests de cálculos financieros (pnpm test:calculations)...');
        await execAsync('pnpm test:calculations');
        console.log('✅ Tests de cálculos exitosos.');

        // Ajustar el comando si es necesario
        console.log('\n🗄️ Tests de base de datos (pnpm test -- tests/integration/database.test.ts)...');
        await execAsync('pnpm test -- tests/integration/database.test.ts');
        console.log('✅ Tests de BD exitosos.');

        console.log('\n🎯 Test de ejemplo del Excel (pnpm example:calculator)...');
        await execAsync('pnpm example:calculator');
        console.log('✅ Ejemplo del Excel validado.');

        console.log('');
    } catch (error) {
        console.warn('⚠️ Algunos tests fallaron. La configuración básica puede estar completa.');
        console.warn('💡 Ejecute "pnpm test" o los tests específicos más tarde para revisar.');
        console.log('');
    }
}

async function finalSetup() {
    console.log('🔧 Configuración final (usando pnpm)...\n');
    try {
        console.log('🔍 Verificando configuración...');
        // Para verificar la conexión, DATABASE_URL debe estar disponible para el subproceso de prisma
        // El `echo ... | pnpm exec prisma db execute --stdin` es una forma.
        // Asegúrate que el DATABASE_URL de .env sea leído por `pnpm exec prisma`.
        console.log('   Verificando conexión a BD con Prisma...');
        await execAsync('echo "SELECT 1 as test;" | pnpm exec prisma db execute --stdin');
        console.log('✅ Conexión a base de datos OK.');

        console.log('\n   Verificando tipos con TypeScript (pnpm type-check)...');
        await execAsync('pnpm type-check');
        console.log('✅ Verificación de tipos OK.');

        const uploadsDir = './uploads';
        try {
            await fs.access(uploadsDir);
        } catch {
            await fs.mkdir(uploadsDir, { recursive: true });
            console.log('✅ Directorio de uploads creado.');
        }

        // ... (verificación de archivos clave sin cambios)
        const keyFiles = [
            'lib/services/calculations/FinancialCalculator.ts',
            'lib/services/calculations/ExcelFormulas.ts',
            'app/api/bonds/[bondId]/calculate/route.ts',
            'tests/unit/calculations.test.ts'
        ];
        console.log('\n📋 Verificando archivos clave...');
        for (const file of keyFiles) {
            try {
                await fs.access(file);
                console.log(`✅ ${file}`);
            } catch {
                console.log(`❌ ${file} - no encontrado`);
            }
        }

        console.log('');
    } catch (error) {
        console.warn('⚠️ Algunas verificaciones finales fallaron:', error instanceof Error ? error.message : String(error));
        console.warn('💡 El sistema debería funcionar, pero revise los logs.');
    }
}

if (require.main === module) {
    main().catch(console.error); // main ya maneja el rl.close() en su finally
}