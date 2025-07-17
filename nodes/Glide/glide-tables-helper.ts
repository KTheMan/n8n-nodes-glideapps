import GlideTables from '@glideapps/tables';

if (typeof GlideTables !== 'function') {
  throw new Error('GlideTables is not a constructor. Please check the @glideapps/tables package version and import style.');
}

/**
 * Fetch list of apps (teams) for the authenticated user from the Glide npm package.
 * Returns an array of { name, value } for n8n dropdowns.
 */
export async function getAppsNpm(client: any): Promise<DropdownOption[]> {
  try {
    const apps = await client.getApps();
    return apps.map((app: any) => ({
      name: app.name || app.id,
      value: app.id,
    }));
  } catch (err: any) {
    return [{ name: `Error: ${err?.message || err}`, value: '' }];
  }
}

// =========================
// Types
// =========================

export type DropdownOption = { name: string; value: string | number };
type Mutation = { kind: string; [key: string]: any };
type AddRowParams = { tableName: string; columnValues: Record<string, any> };
type SetColumnsParams = { tableName: string; rowID?: string; rowIndex?: number; columnValues: Record<string, any> };
type DeleteRowParams = { tableName: string; rowID?: string; rowIndex?: number };
type SqlQueryParams = { appID: string; sql: string; params?: any[] };
type QueryTableParams = { appID: string; tableName: string; startAt?: string };

// =========================
// User-Facing GUI Helpers (for n8n loadOptions and dropdowns)
// =========================

/**
 * Returns a warning string to display in the UI before fetching rows.
 * Use this in n8n property descriptions or as a modal/hint.
 */
export function getRowFetchWarning(limit: number) {
  return `⚠️ Fetching rows may return a large amount of data. Only the first ${limit} rows will be shown. Use filters or limits to avoid performance issues.`;
}

/**
 * Helper to fetch rows with explicit user confirmation (for n8n UX).
 * Only fetches if user has acknowledged the warning.
 */
export async function getRowsWithConfirmation(client: any, tableName: string, limit: number, confirmed: boolean): Promise<DropdownOption[]> {
  if (!confirmed) {
    throw new Error('User confirmation required before fetching rows.');
  }
  return getRowPreview(client, tableName, limit);
}

/**
 * Fetch a preview of rows (with a hard limit) for use in n8n dropdowns.
 * Returns an array of { name, value } for the dropdown.
 */
export async function getRowPreview(client: any, tableName: string, limit = 20): Promise<DropdownOption[]> {
  const rows = await getRowsInternal(client, tableName, limit);
  return rows.map((row: any, idx: number) => ({
    name: row.id ? `Row: ${row.id}` : `Row ${idx+1}`,
    value: row.id || idx,
  }));
}

/**
 * Fetch rows for a given table (for dropdowns, with limit).
 * Returns an array of { name, value } for the dropdown.
 */
export async function getRows(client: any, tableName: string, limit = 100): Promise<DropdownOption[]> {
  return getRowPreview(client, tableName, limit);
}

/**
 * Fetch list of columns for a given table (for dropdowns).
 */
export async function getColumns(client: any, tableName: string) {
  const result = await queryTable(client, { appID: '', tableName, startAt: undefined });
  if (result && result[0] && result[0].rows && result[0].rows[0]) {
    return Object.keys(result[0].rows[0]).map(col => ({ name: col, value: col }));
  }
  return [];
}

/**
 * Fetch list of apps (teams) for the authenticated user from the Glide npm package (for dropdowns).
 * This replaces the old v1 endpoint usage.
 */
export async function getApps(token: string): Promise<DropdownOption[]> {
  try {
    const client = new (GlideTables as any)({ token });
    return getAppsNpm(client);
  } catch (err: any) {
    return [{ name: `Error: ${err?.message || err}`, value: '' }];
  }
}

/**
 * Fetch list of tables for a given app (for dropdowns).
 * Placeholder: implement as needed for your Glide setup.
 */
export async function getTables(client: any) {
  try {
    const tables = await client.getTables();
    return tables.map((table: any) => ({
      name: table.name || table.id,
      value: table.id,
    }));
  } catch (err: any) {
    return [{ name: `Error: ${err?.message || err}`, value: '' }];
  }
}

/**
 * Fetch a single row by ID for safe previewing (avoids large data loads).
 */
export async function getRowById(client: any, tableName: string, rowId: string): Promise<any | null> {
  const rows = await getRowsInternal(client, tableName, 1000);
  return rows.find((row: any) => row.id === rowId) || null;
}

// =========================
// Mutation & Query Helpers (for node operations)
// =========================

export async function addRowToTable(client: any, params: AddRowParams) {
  try {
    return await client.mutateTables({
      mutations: [
        {
          kind: 'add-row-to-table',
          tableName: params.tableName,
          columnValues: params.columnValues,
        },
      ],
    });
  } catch (err) {
    throw new Error(`Failed to add row: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function setColumnsInRow(client: any, params: SetColumnsParams) {
  const rowIdentifier = params.rowID ? { rowID: params.rowID } : params.rowIndex !== undefined ? { rowIndex: params.rowIndex } : {};
  try {
    return await client.mutateTables({
      mutations: [
        {
          kind: 'set-columns-in-row',
          tableName: params.tableName,
          columnValues: params.columnValues,
          ...rowIdentifier,
        },
      ],
    });
  } catch (err) {
    throw new Error(`Failed to set columns: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function deleteRow(client: any, params: DeleteRowParams) {
  const rowIdentifier = params.rowID ? { rowID: params.rowID } : params.rowIndex !== undefined ? { rowIndex: params.rowIndex } : {};
  try {
    return await client.mutateTables({
      mutations: [
        {
          kind: 'delete-row',
          tableName: params.tableName,
          ...rowIdentifier,
        },
      ],
    });
  } catch (err) {
    throw new Error(`Failed to delete row: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function batchMutateTables(client: any, mutations: Mutation[]) {
  try {
    return await client.mutateTables({ mutations });
  } catch (err) {
    throw new Error(`Failed to batch mutate: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function runMutations(client: any, mutations: Mutation[]): Promise<any> {
  try {
    return await client.mutateTables({ mutations });
  } catch (err) {
    throw new Error(`Failed to run mutations: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function queryTableSql(client: any, params: SqlQueryParams) {
  try {
    return await client.queryTables({
      queries: [
        {
          sql: params.sql,
          ...(params.params ? { params: params.params } : {}),
        },
      ],
    });
  } catch (err) {
    throw new Error(`Failed to query table (SQL): ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function queryTable(client: any, params: QueryTableParams) {
  try {
    return await client.queryTables({
      queries: [
        {
          tableName: params.tableName,
          ...(params.startAt ? { startAt: params.startAt } : {}),
        },
      ],
    });
  } catch (err) {
    throw new Error(`Failed to query table: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getAllRowsPaginated(
  client: any,
  tableName: string,
  pageSize = 100,
  maxPages = 10
): Promise<any[]> {
  let allRows: any[] = [];
  let startAt: string | undefined = undefined;
  let page = 0;
  while (page < maxPages) {
    const result = await queryTable(client, { appID: '', tableName, startAt });
    if (!result || !result[0] || !result[0].rows) break;
    const rows = result[0].rows;
    allRows = allRows.concat(rows);
    if (!result[0].nextStartAt || rows.length < pageSize) break;
    startAt = result[0].nextStartAt;
    page++;
  }
  return allRows;
}

// =========================
// Internal Utilities
// =========================

function getRowsInternal(client: any, tableName: string, limit = 100): Promise<any[]> {
  return queryTable(client, { appID: '', tableName, startAt: undefined })
    .then(result => (result && result[0] && result[0].rows) ? result[0].rows.slice(0, limit) : []);
}

export function extractMutationErrors(results: any[]): string[] {
  return results
    .filter((r) => r && r.error)
    .map((r) => typeof r.error === 'string' ? r.error : JSON.stringify(r.error));
}

export function getGlideTablesClient(token: string, appId: string) {
  if (!GlideTables) {
    throw new Error('GlideTables class not found in @glideapps/tables. Please check the package version and import.');
  }
  return new (GlideTables as any)({
    token,
    appId,
  });
}