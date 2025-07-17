import * as glideHelpers from './glide-tables-helper';

describe('Glide Tables Helper', () => {
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

  it('returns app list with correct ids and names', async () => {
    glideHelpers.__setGlideTablesModule(goodMock);
    const apps = await glideHelpers.getApps('dummy-token');
    expect(apps).toEqual([
      { name: 'App One', value: 'app1' },
      { name: 'App Two', value: 'app2' },
    ]);
  });

  it('returns table list for a valid app id', async () => {
    glideHelpers.__setGlideTablesModule(goodMock);
    const tables = await glideHelpers.getTables('dummy-token', 'app1');
    expect(tables).toEqual([
      { name: 'Table One', value: 'tbl1' },
      { name: 'Table Two', value: 'tbl2' },
    ]);
  });

  it('returns error if getApps throws', async () => {
    const badMock = {
      getApps: jest.fn(() => { throw new Error('fail'); }),
      app: jest.fn(),
    };
    glideHelpers.__setGlideTablesModule(badMock);
    const result = await glideHelpers.getApps('dummy-token');
    expect(result[0].name).toMatch(/fail/);
  });

  it('returns error if getTables throws', async () => {
    const badMock = {
      app: jest.fn(() => ({ getTables: jest.fn(() => { throw new Error('fail'); }) })),
      getApps: jest.fn(),
    };
    glideHelpers.__setGlideTablesModule(badMock);
    const result = await glideHelpers.getTables('dummy-token', 'app1');
    expect(result[0].name).toMatch(/fail/);
  });
});
