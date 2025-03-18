import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class ShippoApi implements ICredentialType {
    name = 'shippoApi';
    displayName = 'Shippo API';
    documentationUrl = 'https://docs.goshippo.com/docs/guides_general/authentication/';
    properties: INodeProperties[] = [
        {
            displayName: 'Environment',
            name: 'environment',
            type: 'options',
            default: 'test',
            options: [
                {
                    name: 'Test',
                    value: 'test',
                    description: 'Use test environment (sandbox)',
                },
                {
                    name: 'Live',
                    value: 'live',
                    description: 'Use live environment (production)',
                },
            ],
        },
        {
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
            description: 'Your Shippo API Token (starts with "shippo_test_" or "shippo_live_")',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'Authorization': '=ShippoToken {{$credentials.apiToken}}',
                'Shippo-API-Version': '2018-02-08'
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://api.goshippo.com',
            url: '/addresses/',
            method: 'GET',
        },
    };
}