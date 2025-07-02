import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
console.log('DATABASE_URL:', process.env.DATABASE_URL);
import { PrismaClient } from '../lib/generated/client';
import { BondCalculationsService } from '../lib/services/bonds/BondCalculations';
import { BondModel } from '../lib/models/Bond';

async function main() {
    const prisma = new PrismaClient();
    const bondModel = new BondModel(prisma);
    const bondCalcService = new BondCalculationsService(prisma);

    try {
        const allBonds = await bondModel.findMany({ limit: 10000 });
        if (allBonds.length === 0) {
            console.log('No hay bonos en la base de datos.');
            return;
        }
        console.log(`Encontrados ${allBonds.length} bonos. Recalculando flujos...`);

        let successCount = 0;
        let errorCount = 0;
        for (const bond of allBonds) {
            try {
                const result = await bondCalcService.calculateBond({ bondId: bond.id, recalculate: true, saveResults: true });
                if (result.success) {
                    console.log(`✅ Bono ${bond.name} (${bond.id}) recalculado correctamente.`);
                    successCount++;
                } else {
                    console.error(`❌ Error recalculando bono ${bond.name} (${bond.id}):`, result.errors);
                    errorCount++;
                }
            } catch (err) {
                console.error(`❌ Excepción al recalcular bono ${bond.name} (${bond.id}):`, err);
                errorCount++;
            }
        }
        console.log(`\nResumen: ${successCount} bonos recalculados correctamente, ${errorCount} con error.`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error('Error crítico en el script:', e);
    process.exit(1);
});