import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class GlideappsApi implements ICredentialType {
    name = 'glideappsApi';
    displayName = 'Glide Apps API';
    documentationUrl = 'https://apidocs.glideapps.com/api-reference/v2/general/authentication';
    properties: INodeProperties[] = [
        {
            displayName: 'Environment',
            name: 'environment',
            type: 'options',
            default: 'test',
        },
        {
            displayName: 'API Token',
            name: 'apiToken',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
            description: 'Your Glide Apps API Token',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'Authorization': 'Bearer {{$credentials.apiToken}}'
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://api.glideapps.com/',
            url: 'tables',
            method: 'GET',
        },
    };
}