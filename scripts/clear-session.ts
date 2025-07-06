#!/usr/bin/env tsx
// scripts/clear-session.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function clearSession() {
    console.log('🧹 Limpiando sesión del usuario...\n');

    try {
        // Limpiar cookies del navegador (esto es solo informativo)
        console.log('📋 Para limpiar completamente la sesión:');
        console.log('1. Abre las herramientas de desarrollador (F12)');
        console.log('2. Ve a la pestaña Application/Storage');
        console.log('3. En Cookies, elimina todas las cookies de localhost:3000');
        console.log('4. En Local Storage, elimina todos los datos de localhost:3000');
        console.log('\nO simplemente abre una ventana de incógnito/privada.\n');

        // Verificar si el servidor está ejecutándose
        try {
            await execAsync('curl -s http://localhost:3000/api/health');
            console.log('✅ Servidor está ejecutándose en http://localhost:3000');
        } catch (error) {
            console.log('❌ Servidor no está ejecutándose. Ejecuta: pnpm dev');
        }

        console.log('\n🎯 Ahora puedes:');
        console.log('1. Ir a http://localhost:3000');
        console.log('2. Serás redirigido a /auth/login');
        console.log('3. Registrar un nuevo usuario');
        console.log('4. Completar el perfil de emisor');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

clearSession(); 