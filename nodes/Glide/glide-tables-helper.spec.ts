import * as glideHelpers from './glide-tables-helper';

describe('Glide Tables Helper (unit tests)', () => {
  const goodMock = {
    app: jest.fn(({ token, appId }) => ({
      getTables: jest.fn(() => [
        { id: 'tbl1', name: 'Table One' },
        { id: 'tbl2', name: 'Table Two' },
      ]),
    })),
    getApps: jest.fn(({ token }) => [
      { id: 'app1', name: 'App One' },
      { id: 'app2', name: 'App Two' },
    ]),
  };

  afterEach(() => {
    glideHelpers.__setGlideTablesModule(null);
  });

  it('unit: returns app list with correct ids and names', async () => {
    glideHelpers.__setGlideTablesModule(goodMock);
    const apps = await glideHelpers.getApps('dummy-token');
    expect(apps).toEqual([
      { name: 'App One', value: 'app1' },
      { name: 'App Two', value: 'app2' },
    ]);
  });

  it('unit: returns table list for a valid app id', async () => {
    glideHelpers.__setGlideTablesModule(goodMock);
    const tables = await glideHelpers.getTables('dummy-token', 'app1');
    expect(tables).toEqual([
      { name: 'Table One', value: 'tbl1' },
      { name: 'Table Two', value: 'tbl2' },
    ]);
  });

  it('unit: returns error if getApps throws', async () => {
    const badMock = {
      getApps: jest.fn(() => { throw new Error('fail'); }),
      app: jest.fn(),
    };
    glideHelpers.__setGlideTablesModule(badMock);
    const result = await glideHelpers.getApps('dummy-token');
    expect(result[0].name).toMatch(/fail/);
  });

  it('unit: returns error if getTables throws', async () => {
    const badMock = {
      app: jest.fn(() => ({ getTables: jest.fn(() => { throw new Error('fail'); }) })),
      getApps: jest.fn(),
    };
    glideHelpers.__setGlideTablesModule(badMock);
    const result = await glideHelpers.getTables('dummy-token', 'app1');
    expect(result[0].name).toMatch(/fail/);
  });

  describe('unit: getRows and getColumns with dummy/mock data', () => {
    const mockTable = {
      props: { table: 'tbl1', name: 'Table One' },
      get: jest.fn(() => Promise.resolve([
        { $rowID: 'row1', colA: 'A1', colB: 'B1' },
        { $rowID: 'row2', colA: 'A2', colB: 'B2' },
      ])),
      getSchema: jest.fn(() => Promise.resolve({
        data: { columns: [ { name: 'colA' }, { name: 'colB' } ] }
      })),
    };
    const mockClient = {
      getTables: jest.fn(() => Promise.resolve([mockTable])),
    };

    it('unit: getRows returns dropdown options for rows', async () => {
      const rows = await glideHelpers.getRows(mockClient, 'tbl1');
      expect(rows).toEqual([
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
        { name: 'row1', value: 'row1' },
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
        { name: 'row2', value: 'row2' },
      ]);
    });

    it('unit: getColumns returns dropdown options for columns', async () => {
      const cols = await glideHelpers.getColumns(mockClient, 'tbl1');
      expect(cols).toEqual([
        { name: 'colA', value: 'colA' },
        { name: 'colB', value: 'colB' },
      ]);
    });

    it('unit: getRows throws if table not found', async () => {
      const badClient = { getTables: jest.fn(() => Promise.resolve([])) };
      await expect(glideHelpers.getRows(badClient, 'tblX')).rejects.toThrow('Table not found');
    });

    it('unit: getColumns throws if schema is invalid', async () => {
      const badTable = { ...mockTable, getSchema: jest.fn(() => Promise.resolve({ data: { columns: null } })) };
      const badClient = { getTables: jest.fn(() => Promise.resolve([badTable])) };
      await expect(glideHelpers.getColumns(badClient, 'tbl1')).rejects.toThrow('Invalid schema structure');
    });
  });
});
const apiKey = process.env.GLIDE_API_KEY;
if (apiKey) {
  describe('Glide Tables Helper (integration tests - real API, requires GLIDE_API_KEY)', () => {
    let client: any;
    let tables: any[];
    let appId: string;
    beforeAll(async () => {
      const { getApps, getGlideTablesClient } = glideHelpers;
      const apps = await getApps(apiKey);
      appId = String(apps[0]?.value);
      client = getGlideTablesClient(apiKey, appId);
      tables = await client.getTables();
    });

    it('integration: getRows returns dropdown options for rows (real API)', async () => {
      expect(tables).toBeDefined();
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBeGreaterThan(0);
      const table = tables[0];
      const rows = await glideHelpers.getRows(client, table.props.table);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]).toHaveProperty('name');
      expect(rows[0]).toHaveProperty('value');
    });

    it('integration: getColumns returns dropdown options for columns (real API)', async () => {
      expect(tables).toBeDefined();
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBeGreaterThan(0);
      const table = tables[0];
      const cols = await glideHelpers.getColumns(client, table.props.table);
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThan(0);
      expect(cols[0]).toHaveProperty('name');
      expect(cols[0]).toHaveProperty('value');
    });

    it('integration: getRows throws if table not found (real API)', async () => {
      await expect(glideHelpers.getRows(client, 'not_a_real_table')).rejects.toThrow('Table not found');
    });

    it('integration: getColumns throws if table not found (real API)', async () => {
      await expect(glideHelpers.getColumns(client, 'not_a_real_table')).rejects.toThrow('Table not found');
    });
  });
} else {
  describe('Glide Tables Helper (integration tests)', () => {
    it('integration: warns and skips integration tests if GLIDE_API_KEY is not set', () => {
      // eslint-disable-next-line no-console
      console.warn('[glide-tables-helper.spec.ts] WARNING: GLIDE_API_KEY not set, skipping integration tests.');
      expect(true).toBe(true);
    });
  });
}
