

import {
    INodeType,
    INodeTypeDescription,
    ILoadOptionsFunctions,
    IExecuteFunctions,
    INodeExecutionData,
    NodeOperationError,
} from 'n8n-workflow';
import { N8NPropertiesBuilder, N8NPropertiesBuilderConfig } from '@devlikeapro/n8n-openapi-node';
import * as doc from './openapi.json';
import * as glideHelpers from './glide-tables-helper';

const config: N8NPropertiesBuilderConfig = {};
const parser = new N8NPropertiesBuilder(doc, config);
const openapiProperties = parser.build();

// Selector for API type
const apiTypeSelector = {
    displayName: 'API Type',
    name: 'apiType',
    type: 'options',
    options: [
        { name: 'Big Tables API (OpenAPI)', value: 'openapi' },
        { name: 'Glide Npm Api (@glideapps/Tables)', value: 'npm' },
    ],
    default: 'openapi',
    description: 'Choose which Glide API to use for this operation',
};

// --- Strong TypeScript Types for Dropdowns ---
import type { DropdownOption } from './glide-tables-helper';

// --- Helper: Safe dropdown fetch with error feedback ---
async function safeDropdown<T>(fn: () => Promise<T[]>): Promise<T[]> {
    try {
        const result = await fn();
        return Array.isArray(result) ? result : [];
    } catch (err: any) {
        return [{ name: `Error: ${err?.message || err}`, value: '' }] as any;
    }
}


// --- n8n GUI Properties for npm API (CRUD, resource/operation split) ---
const npmApiProperties = [
    {
        displayName: 'Usage Tips',
        name: 'usageTips',
        type: 'notice',
        default: '',
        displayOptions: {
            show: {
                apiType: ['npm'],
            },
        },
        description: `<ul>
        <li>Use <b>Row Limit</b> and <b>Row Search</b> to avoid loading too much data.</li>
        <li>Enable <b>Confirm Row Fetch</b> for large tables to prevent accidental data loads.</li>
        <li>Use <b>Column Type Filter</b> to show only certain column types.</li>
        <li>All dropdowns support expressions for advanced use.</li>
        </ul>`,
    },
    {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
            { name: 'Table', value: 'table' },
            { name: 'Row', value: 'row' },
        ],
        default: 'table',
        required: true,
        displayOptions: {
            show: {
                apiType: ['npm'],
            },
        },
    },
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
            // Table operations
            { name: 'Get Many', value: 'tableGetAll', action: 'List many tables', resource: 'table' },
            { name: 'Create', value: 'tableCreate', action: 'Create a new table', resource: 'table' },
            { name: 'Delete', value: 'tableDelete', action: 'Delete a table', resource: 'table' },
            // Row operations
            { name: 'Add', value: 'rowCreate', action: 'Add a new row', resource: 'row' },
            { name: 'Remove', value: 'rowDelete', action: 'Delete a row', resource: 'row' },
            { name: 'Get', value: 'rowGet', action: 'Get a single row', resource: 'row' },
            { name: 'Get All', value: 'rowGetAll', action: 'Get all rows', resource: 'row' },
            { name: 'Update', value: 'rowUpdate', action: 'Update a row', resource: 'row' },
        ],
        default: 'tableGetAll',
        required: true,
        displayOptions: {
            show: {
                apiType: ['npm'],
            },
        },
    },
    // --- Table fields ---
    {
        displayName: 'App Name or ID',
        name: 'appId',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getAppsDropdown',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['table', 'row'],
            },
        },
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
    },
    {
        displayName: 'Table Name or ID',
        name: 'tableName',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getTablesDropdown',
            loadOptionsDependsOn: ['appId'],
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row', 'table'],
                operation: ['tableGetAll', 'tableCreate', 'tableDelete', 'rowGet', 'rowCreate', 'rowUpdate', 'rowDelete', 'rowGetAll'],
            },
        },
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
    },
    // --- Row fields ---
    {
        displayName: 'Row Name or ID',
        name: 'rowId',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getRowsDropdown',
            loadOptionsDependsOn: ['appId', 'tableName', 'rowSearch', 'rowLimit'],
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['rowGet', 'rowUpdate', 'rowDelete'],
            },
        },
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
    },
    {
        displayName: 'Row Data',
        name: 'rowData',
        type: 'json',
        default: '{}',
        required: true,
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['rowCreate', 'rowUpdate'],
            },
        },
        description: 'Row data as JSON object with column names as keys',
    },
    // --- Advanced/optional fields ---
    {
        displayName: 'Row Search',
        name: 'rowSearch',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['rowGetAll'],
            },
        },
        description: 'Filter rows by text (applies to all columns)',
    },
    {
        displayName: 'Row Limit',
        name: 'rowLimit',
        type: 'number',
        default: 20,
        typeOptions: {
            minValue: 1,
            maxValue: 200,
        },
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['rowGetAll'],
            },
        },
        description: 'Maximum number of rows to fetch for dropdowns',
    },
    {
        displayName: 'Confirm Row Fetch',
        name: 'confirmRowFetch',
        type: 'boolean',
        default: false,
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['rowGetAll'],
            },
        },
        description: 'Whether to enable fetching rows for preview or selection if the table is large',
    },
    {
        displayName: 'Column Name or ID',
        name: 'columnName',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getColumnsDropdown',
            loadOptionsDependsOn: ['appId', 'tableName', 'columnTypeFilter'],
        },
        default: '',
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['rowGet', 'rowUpdate'],
            },
        },
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
    },
    {
        displayName: 'Column Type Filter',
        name: 'columnTypeFilter',
        type: 'multiOptions',
        options: [
            { name: 'Boolean', value: 'boolean' },
            { name: 'Date', value: 'date' },
            { name: 'Number', value: 'number' },
            { name: 'Other', value: 'other' },
            { name: 'Text', value: 'text' },
        ],
        default: [],
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['rowGet', 'rowUpdate'],
            },
        },
        description: 'Filter columns by type for the dropdown',
    },
    {
        displayName: 'Row Name or ID',
        name: 'rowPreview',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getRowsWithConfirmationDropdown',
            loadOptionsDependsOn: ['appId', 'tableName', 'confirmRowFetch', 'rowLimit'],
        },
        default: '',
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['rowGetAll'],
            },
        },
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
    },
];

const patchedOpenapiProperties = openapiProperties.map((prop: any) => ({
    ...prop,
    displayOptions: {
        ...(prop.displayOptions || {}),
        show: {
            ...(prop.displayOptions?.show || {}),
            apiType: ['openapi'],
        },
    },
}));

export class Glide implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Glide Apps',
        name: 'glide',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:logo.png',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Interact with Glide Apps API',
        defaults: {
            name: 'Glide',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'glideappsApi',
                required: true,
            },
        ],
        requestDefaults: {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            baseURL: 'https://api.glideapps.com',
        },
        properties: [
            apiTypeSelector,
            ...patchedOpenapiProperties,
            ...npmApiProperties,
        ],
    };

    methods = {
        loadOptions: {
            // App dropdown for npm API
            async getAppsDropdown(this: ILoadOptionsFunctions): Promise<DropdownOption[]> {
                const creds = await this.getCredentials('glideappsApi');
                const token = creds.token as string;
                return safeDropdown(() => glideHelpers.getApps(token));
            },
            // Dynamic tables dropdown for npm API
            async getTablesDropdown(this: ILoadOptionsFunctions): Promise<DropdownOption[]> {
                const creds = await this.getCredentials('glideappsApi');
                const token = creds.token as string;
                const appId = this.getNodeParameter('appId', 0) as string;
                return safeDropdown(async () => {
                    const tables = await glideHelpers.getTables(token, appId);
                    return Array.isArray(tables) ? tables : [];
                });
            },
            async getRowsDropdown(this: ILoadOptionsFunctions): Promise<DropdownOption[]> {
                const creds = await this.getCredentials('glideappsApi');
                const token = creds.token as string;
                const appId = this.getNodeParameter('appId', 0) as string;
                const tableName = this.getNodeParameter('tableName', 0) as string;
                const search = (this.getNodeParameter('rowSearch', 0) as string) || '';
                const limit = Number(this.getNodeParameter('rowLimit', 0));
                // getRows still expects a client, so we use the helper
                const client = glideHelpers.getGlideTablesClient(token, appId);
                return safeDropdown(async () => {
                    let rows = await glideHelpers.getRows(client, tableName, limit);
                    if (search) {
                        rows = rows.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));
                    }
                    return rows;
                });
            },
            async getColumnsDropdown(this: ILoadOptionsFunctions): Promise<DropdownOption[]> {
                const creds = await this.getCredentials('glideappsApi');
                const token = creds.token as string;
                const appId = this.getNodeParameter('appId', 0) as string;
                const tableName = this.getNodeParameter('tableName', 0) as string;
                const typeFilter = (this.getNodeParameter('columnTypeFilter', 0) as string[]) || [];
                const client = glideHelpers.getGlideTablesClient(token, appId);
                return safeDropdown(async () => {
                    let columns = await glideHelpers.getColumns(client, tableName);
                    if (typeFilter.length) {
                        // Example: filter by column type if your helper returns type info
                        columns = columns.filter((col: any) => typeFilter.includes(col.type || 'other'));
                    }
                    return columns;
                });
            },
            async getRowsWithConfirmationDropdown(this: ILoadOptionsFunctions): Promise<DropdownOption[]> {
                const creds = await this.getCredentials('glideappsApi');
                const token = creds.token as string;
                const appId = this.getNodeParameter('appId', 0) as string;
                const tableName = this.getNodeParameter('tableName', 0) as string;
                const confirmed = !!this.getNodeParameter('confirmRowFetch', 0);
                const limit = Number(this.getNodeParameter('rowLimit', 0));
                if (!confirmed) {
                    return [{ name: '⚠️ Please Enable Confirmation to Fetch Rows.', value: '' }];
                }
                const client = glideHelpers.getGlideTablesClient(token, appId);
                return safeDropdown(() => glideHelpers.getRowsWithConfirmation(client, tableName, limit, confirmed));
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const apiType = this.getNodeParameter('apiType', 0) as string;

        // Only handle npm API operations here; OpenAPI operations are handled by the framework
        if (apiType !== 'npm') {
            throw new NodeOperationError(this.getNode(), 'OpenAPI operations are not yet implemented in execute method. Use npm API type.');
        }

        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;

        for (let i = 0; i < items.length; i++) {
            try {
                const creds = await this.getCredentials('glideappsApi');
                const token = creds.token as string;
                const appId = this.getNodeParameter('appId', i) as string;
                const client = glideHelpers.getGlideTablesClient(token, appId);

                if (resource === 'table') {
                    if (operation === 'tableGetAll') {
                        // Get all tables
                        const tables = await client.getTables();
                        const formattedTables = tables.map((table: any) => ({
                            name: table.props?.name || 'Unknown',
                            id: table.props?.table || '',
                        }));
                        returnData.push({ json: { tables: formattedTables } });
                    } else {
                        throw new NodeOperationError(this.getNode(), `Table operation '${operation}' is not yet implemented`);
                    }
                } else if (resource === 'row') {
                    const tableName = this.getNodeParameter('tableName', i) as string;

                    if (operation === 'rowCreate') {
                        // Add row
                        const rowData = this.getNodeParameter('rowData', i) as string;
                        const columnValues = typeof rowData === 'string' ? JSON.parse(rowData) : rowData;
                        const result = await glideHelpers.addRowToTable(client, {
                            tableName,
                            columnValues,
                        });
                        returnData.push({ json: result });
                    } else if (operation === 'rowUpdate') {
                        // Update row
                        const rowId = this.getNodeParameter('rowId', i) as string;
                        const rowData = this.getNodeParameter('rowData', i) as string;
                        const columnValues = typeof rowData === 'string' ? JSON.parse(rowData) : rowData;
                        const result = await glideHelpers.setColumnsInRow(client, {
                            tableName,
                            rowID: rowId,
                            columnValues,
                        });
                        returnData.push({ json: result });
                    } else if (operation === 'rowDelete') {
                        // Delete row
                        const rowId = this.getNodeParameter('rowId', i) as string;
                        const result = await glideHelpers.deleteRow(client, {
                            tableName,
                            rowID: rowId,
                        });
                        returnData.push({ json: result });
                    } else if (operation === 'rowGet') {
                        // Get single row
                        const rowId = this.getNodeParameter('rowId', i) as string;
                        const row = await glideHelpers.getRowById(client, tableName, rowId);
                        returnData.push({ json: row || {} });
                    } else if (operation === 'rowGetAll') {
                        // Get all rows
                        const limit = this.getNodeParameter('rowLimit', i, 100) as number;
                        const rows = await glideHelpers.getAllRowsPaginated(client, tableName, limit, 10);
                        returnData.push({ json: { rows } });
                    } else {
                        throw new NodeOperationError(this.getNode(), `Row operation '${operation}' is not supported`);
                    }
                } else {
                    throw new NodeOperationError(this.getNode(), `Resource '${resource}' is not supported`);
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error instanceof Error ? error.message : String(error),
                        },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
