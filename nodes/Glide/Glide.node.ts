import {INodeType, INodeTypeDescription} from 'n8n-workflow';
import {N8NPropertiesBuilder, N8NPropertiesBuilderConfig} from '@devlikeapro/n8n-openapi-node';
import * as doc from './openapi.json';

const config: N8NPropertiesBuilderConfig = {}
const parser = new N8NPropertiesBuilder(doc, config);
const properties = parser.build()

export class Glide implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Glide Apps',
        name: 'glide',
        icon: 'file:logo.svg',
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
                name: 'glideApi',
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
        properties: properties,
    };
}
