import winston from 'winston';
import dotenv from 'dotenv';
dotenv.config();

export function logger(winstonInstance) {
    winstonInstance.configure({
        level: process.env.DebugLogging ? 'debug' : 'info',
        transports: [
            //
            // - Write all logs error (and below) to `error.log`.
            new winston.transports.File({ filename: 'error.log', level: 'error' }),
            //
            // - Write to all logs with specified level to console.
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        ]
    });

    return async (ctx, next) => {

        const start = new Date().getTime();

        await next();

        const ms = new Date().getTime() - start;

        let logLevel;
        if (ctx.status >= 500) {
            logLevel = 'error';
        } else if (ctx.status >= 400) {
            logLevel = 'warn';
        } else if (ctx.status >= 100) {
            logLevel = 'info';
        }

        const msg = `${ctx.method} ${ctx.originalUrl} ${ctx.status} ${ms}ms`;

        winstonInstance.log(logLevel, msg);
    };
}