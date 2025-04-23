import { INodeProperties } from 'n8n-workflow';

// Language operations
export const languageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['language'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many languages',
				description: 'Get many supported languages',
				routing: {
					request: {
						method: 'GET',
						url: '/languages',
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

// No fields needed for language operations
export const languageFields: INodeProperties[] = [];
