import { PrismaClient } from '@prisma/client';

console.log(process.env.DATABASE_URL || import.meta.env.DATABASE_URL);

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || import.meta.env.DATABASE_URL,
        }
    }
});
export default prisma;
