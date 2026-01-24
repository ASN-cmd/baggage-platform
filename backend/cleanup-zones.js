import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    try {
        const result = await prisma.zone.deleteMany({});
        console.log(`✓ Deleted ${result.count} zones`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
