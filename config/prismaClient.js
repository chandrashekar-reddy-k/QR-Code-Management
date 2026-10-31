//  config/prismaClient.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import { applyAuditPrismaExtension } from '../audit/auditPrismaExtension.js';
import { setAuditPrismaClient } from '../audit/prismaAccessor.js';

const logConfig = [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' }
];

if (process.env.LOG_QUERY === 'true') {
    logConfig.push({ emit: 'event', level: 'query' });
}

const globalForPrisma = globalThis;

const basePrisma =
    globalForPrisma.partnerBasePrisma ||
    new PrismaClient({
        log: logConfig
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.partnerBasePrisma = basePrisma;
}

const prisma = applyAuditPrismaExtension(basePrisma);
setAuditPrismaClient(prisma);

// Enhanced Prisma event logging
if (process.env.LOG_QUERY === 'true') {
    basePrisma.$on('query', (e) => {
        logger.debug('Database query executed', {
            query: e.query,
            params: e.params,
            duration: `${e.duration}ms`,
            target: e.target
        });
    });
}

basePrisma.$on('error', (e) => {
    logger.error('Database error occurred', {
        message: e.message,
        target: e.target
    });
});

basePrisma.$on('info', (e) => {
    logger.info('Database info', {
        message: e.message,
        target: e.target
    });
});

basePrisma.$on('warn', (e) => {
    logger.warn('Database warning', {
        message: e.message,
        target: e.target
    });
});

const connectPostGreSQL = async () => {
    try {
        await prisma.$connect();
        logger.info('Database connection established', {
            database: 'PostgreSQL',
            client: 'Prisma',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.warn('Database connection failed initially. Server will retry dynamically.', {
            error: error.message,
            database: 'PostgreSQL'
        });
    }
};

export { connectPostGreSQL, prisma };