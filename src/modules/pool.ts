import { createPool } from "mysql2/promise";
import type { RowDataPacket, Pool, FieldPacket } from "mysql2/promise";

let pool: Pool | undefined;

export const getPool = (): Pool => {
    pool ??= createPool({
        host: process.env.DB_HOST ?? "localhost",
        port: parseInt(process.env.DB_PORT!),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        enableKeepAlive: true,
        connectTimeout: 100000,
    });

    return pool;
};

export const query = async <T>(
    sql: string,
): Promise<[(RowDataPacket & T)[], FieldPacket[]]> => {
    return getPool().query<(RowDataPacket & T)[]>(sql);
};
