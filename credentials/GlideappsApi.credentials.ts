import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class GlideappsApi implements ICredentialType {
    name = 'glideappsApi';
    displayName = 'Glide Apps API';
    documentationUrl = 'https://www.glideapps.com/docs/api';
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            required: true,
            default: '',
            description: 'Your Glide Apps API Key. Get it from your Glide team settings.',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'Authorization': 'Bearer {{$credentials.apiKey}}'
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            url: 'https://api.glideapps.com/apps',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer {{$credentials.apiKey}}'
            },
        },
    };
}