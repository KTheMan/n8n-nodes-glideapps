

import { INodeType, INodeTypeDescription, ILoadOptionsFunctions } from 'n8n-workflow';
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
            { name: 'Get Many', value: 'getAll', action: 'List many tables', resource: 'table' },
            { name: 'Create Table', value: 'create', action: 'Create a new table', resource: 'table' },
            { name: 'Delete Table', value: 'delete', action: 'Delete a table', resource: 'table' },
            // Row operations
            { name: 'Get Row', value: 'get', action: 'Get a single row', resource: 'row' },
            { name: 'Update Row', value: 'update', action: 'Update a row', resource: 'row' },
        ],
        default: 'getAll',
        required: true,
        displayOptions: {
            show: {
                apiType: ['npm'],
            },
        },
    },
    // --- Table fields ---
    {
        displayName: 'App ID',
        name: 'appId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['table', 'row'],
            },
        },
        description: 'The App ID for your Glide app',
    },
    {
        displayName: 'Table Name or ID',
        name: 'tableName',
        type: 'options',
        typeOptions: {
            loadOptionsMethod: 'getTablesDropdown',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row', 'table'],
                operation: ['getAll', 'get', 'create', 'update', 'delete'],
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
            loadOptionsDependsOn: ['tableName', 'rowSearch', 'rowLimit'],
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['get', 'update', 'delete'],
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
                operation: ['create', 'update'],
            },
        },
        description: 'Row data as JSON object',
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
                operation: ['getAll'],
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
                operation: ['getAll'],
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
                operation: ['getAll'],
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
            loadOptionsDependsOn: ['tableName', 'columnTypeFilter'],
        },
        default: '',
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['get', 'update'],
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
                operation: ['get', 'update'],
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
            loadOptionsDependsOn: ['tableName', 'confirmRowFetch', 'rowLimit'],
        },
        default: '',
        displayOptions: {
            show: {
                apiType: ['npm'],
                resource: ['row'],
                operation: ['getAll'],
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
            // Dynamic tables dropdown for npm API
            async getTablesDropdown(this: ILoadOptionsFunctions): Promise<DropdownOption[]> {
                const creds = await this.getCredentials('glideApi');
                const apiKey = creds.apiKey as string;
                const appId = this.getNodeParameter('appId', 0) as string;
                return safeDropdown(async () => {
                    const client = glideHelpers.getGlideTablesClient(apiKey, appId);
                    const tables = await glideHelpers.getTables(client);
                    return Array.isArray(tables) ? tables : [];
                });
            },
            async getRowsDropdown(this: ILoadOptionsFunctions): Promise<DropdownOption[]> {
                const creds = await this.getCredentials('glideApi');
                const apiKey = creds.apiKey as string;
                const appId = this.getNodeParameter('appId', 0) as string;
                const tableName = this.getNodeParameter('tableName', 0) as string;
                const search = (this.getNodeParameter('rowSearch', 0) as string) || '';
                const limit = Number(this.getNodeParameter('rowLimit', 0));
                const client = glideHelpers.getGlideTablesClient(apiKey, appId);
                return safeDropdown(async () => {
                    let rows = await glideHelpers.getRows(client, tableName, limit);
                    if (search) {
                        rows = rows.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()));
                    }
                    return rows;
                });
            },
            async getColumnsDropdown(this: ILoadOptionsFunctions): Promise<DropdownOption[]> {
                const creds = await this.getCredentials('glideApi');
                const apiKey = creds.apiKey as string;
                const appId = this.getNodeParameter('appId', 0) as string;
                const tableName = this.getNodeParameter('tableName', 0) as string;
                const typeFilter = (this.getNodeParameter('columnTypeFilter', 0) as string[]) || [];
                const client = glideHelpers.getGlideTablesClient(apiKey, appId);
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
                const creds = await this.getCredentials('glideApi');
                const apiKey = creds.apiKey as string;
                const appId = this.getNodeParameter('appId', 0) as string;
                const tableName = this.getNodeParameter('tableName', 0) as string;
                const confirmed = !!this.getNodeParameter('confirmRowFetch', 0);
                const limit = Number(this.getNodeParameter('rowLimit', 0));
                if (!confirmed) {
                    return [{ name: '⚠️ Please Enable Confirmation to Fetch Rows.', value: '' }];
                }
                const client = glideHelpers.getGlideTablesClient(apiKey, appId);
                return safeDropdown(() => glideHelpers.getRowsWithConfirmation(client, tableName, limit, confirmed));
            },
        },
    };
}
