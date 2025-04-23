import { INodeProperties } from 'n8n-workflow';

// Key operations
export const keyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['key'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an API key',
				description: 'Create a new API key',
				routing: {
					request: {
						method: 'POST',
						url: '/key',
						headers: {
							'Authorization': '=Bearer {{$credentials.apiKey}}',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an API key',
				description: 'Get a specific API key',
				routing: {
					request: {
						method: 'GET',
						url: '/key/{{$parameter.keyId}}',
						headers: {
							'Authorization': '=Bearer {{$credentials.apiKey}}',
						},
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many API keys',
				description: 'Get many API keys',
				routing: {
					request: {
						method: 'GET',
						url: '/key',
						headers: {
							'Authorization': '=Bearer {{$credentials.apiKey}}',
						},
					},
				},
			},
		],
		default: 'getAll',
	},
];

// Here we define any fields that are needed for key operations
export const keyFields: INodeProperties[] = [
	{
		displayName: 'Key ID',
		name: 'keyId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['key'],
				operation: ['get'],
			},
		},
		description: 'The ID of the API key',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['key'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the API key',
			},
			{
				displayName: 'Expiry Date',
				name: 'expiryDate',
				type: 'dateTime',
				default: '',
				description: 'Expiry date of the API key',
			},
		],
	},
];
