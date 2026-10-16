/**
 * Kysely dialect for Better Auth on Neon that is safe on Cloudflare Workers.
 *
 * Workers forbid reusing an I/O object (socket/WebSocket) across requests, so a
 * module-level Pool works for the first request and 500s afterwards. This driver
 * opens a fresh Neon `Client` for every connection Kysely acquires and closes it
 * on release, so nothing outlives the request that created it.
 */
import { Client, neonConfig } from "@neondatabase/serverless";
import {
  CompiledQuery,
  type DatabaseConnection,
  type DatabaseIntrospector,
  type Dialect,
  type Driver,
  type Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type QueryCompiler,
  type QueryResult,
  type TransactionSettings,
} from "kysely";

export function neonDialect(connectionString: string, ensureWs?: () => Promise<void>): Dialect {
  return {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new NeonDriver(connectionString, ensureWs),
    createQueryCompiler: (): QueryCompiler => new PostgresQueryCompiler(),
    createIntrospector: (db: Kysely<unknown>): DatabaseIntrospector => new PostgresIntrospector(db),
  };
}

class NeonDriver implements Driver {
  constructor(private readonly url: string, private readonly ensureWs?: () => Promise<void>) {}
  async init(): Promise<void> {}
  async acquireConnection(): Promise<DatabaseConnection> {
    await this.ensureWs?.();
    const client = new Client({ connectionString: this.url });
    await client.connect();
    return new NeonConnection(client);
  }
  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    await (connection as NeonConnection).client.end().catch(() => {});
  }
  async beginTransaction(conn: DatabaseConnection, settings: TransactionSettings): Promise<void> {
    const iso = settings.isolationLevel ? ` isolation level ${settings.isolationLevel}` : "";
    await conn.executeQuery(CompiledQuery.raw(`start transaction${iso}`));
  }
  async commitTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("commit"));
  }
  async rollbackTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("rollback"));
  }
  async destroy(): Promise<void> {}
}

class NeonConnection implements DatabaseConnection {
  constructor(readonly client: Client) {}
  async executeQuery<R>(compiled: CompiledQuery): Promise<QueryResult<R>> {
    const res = await this.client.query(compiled.sql, compiled.parameters as unknown[]);
    const isWrite = /^(insert|update|delete|merge)/i.test(res.command ?? "");
    return {
      rows: res.rows as R[],
      ...(isWrite && res.rowCount != null ? { numAffectedRows: BigInt(res.rowCount) } : {}),
    };
  }
  // eslint-disable-next-line require-yield
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("streaming is not supported");
  }
}

export { neonConfig };
