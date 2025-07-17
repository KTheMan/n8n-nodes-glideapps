

// Allow dependency injection for testability
let _glideTablesModule: any = null;
function getGlideTablesModule() {
  if (_glideTablesModule) return _glideTablesModule;
  // Default to real module
  return require('@glideapps/tables');
}

// For tests
export function __setGlideTablesModule(mock: any) {
  _glideTablesModule = mock;
}

// Helper to create a Glide app client
// Only token is required for app/team-level operations.
// For table/row/column operations, appId is also required.
function getGlideAppClient(token: string, appId?: string, glideTablesModule?: any) {
  const mod = glideTablesModule || getGlideTablesModule();
  if (!appId) throw new Error('appId is required');
  // Set token via environment variable for the module
  process.env.GLIDE_TOKEN = token;
  return mod.app(appId);
}

// For compatibility with other files
export const getGlideTablesClient = getGlideAppClient;



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
  // Uses the real Glide Table API: table.get() returns array of row objects
  if (!client || typeof client.getTables !== 'function') throw new Error('Invalid Glide client');
  const tables = await client.getTables();
  const table = tables.find((t: any) => t.props && (t.props.table === tableName || t.props.name === tableName));
  if (!table) throw new Error('Table not found');
  if (typeof table.get !== 'function') throw new Error('Table does not support get');
  const rows = await table.get();
  if (!Array.isArray(rows)) throw new Error('Invalid rows structure');
  return rows.slice(0, limit).map((row: any, idx: number) => ({ name: row.$rowID || `Row ${idx+1}`, value: row.$rowID || '' }));
}

/**
 * Fetch list of columns for a given table (for dropdowns).
 */
export async function getColumns(client: any, tableName: string) {
  // Uses the real Glide Table API: table.getSchema().data.columns
  if (!client || typeof client.getTables !== 'function') throw new Error('Invalid Glide client');
  const tables = await client.getTables();
  const table = tables.find((t: any) => t.props && (t.props.table === tableName || t.props.name === tableName));
  if (!table) throw new Error('Table not found');
  if (typeof table.getSchema !== 'function') throw new Error('Table does not support getSchema');
  const schema = await table.getSchema();
  if (!schema || !schema.data || !Array.isArray(schema.data.columns)) throw new Error('Invalid schema structure');
  return schema.data.columns.map((col: any) => ({ name: col.name, value: col.name }));
}

/**
 * Fetch list of apps (teams) for the authenticated user from the Glide npm package (for dropdowns).
 * Only requires the user's token (top-level in the hierarchy).
 */
export async function getApps(token: string, glideTablesModule?: any): Promise<DropdownOption[]> {
  try {
    const mod = glideTablesModule || getGlideTablesModule();
    if (typeof mod.getApps !== 'function') {
      throw new Error('glideTablesModule.getApps is not a function. Please check the @glideapps/tables package version and documentation.');
    }
    const apps = await mod.getApps({ token });
    return Array.isArray(apps)
      ? apps.map((app: any) => ({ name: app.name || app.id, value: app.id }))
      : [];
  } catch (err: any) {
    return [{ name: `Error: ${err?.message || err}`, value: '' }];
  }
}

/**
 * Fetch list of tables for a given app (for dropdowns).
 * Requires both token and appId (second level in the hierarchy).
 */
export async function getTables(token: string, appId: string, glideTablesModule?: any): Promise<DropdownOption[]> {
  try {
    const client = getGlideAppClient(token, appId, glideTablesModule);
    const tables = await client.getTables();
    if (!Array.isArray(tables)) {
      return [{ name: 'No Tables Found or Invalid App ID.', value: '' }];
    }
    return tables.map((table: any) => {
      // Official Table object: table.props.name (table name), table.props.table (table id)
      if (table && table.props && table.props.name && table.props.table) {
        return { name: table.props.name, value: table.props.table };
      }
      // fallback for unexpected structure
      return { name: table.name || table.id || 'Unknown', value: table.id || '' };
    });
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

