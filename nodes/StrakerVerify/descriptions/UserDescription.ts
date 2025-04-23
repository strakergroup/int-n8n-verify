import { INodeProperties } from 'n8n-workflow';

// User operations
export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get Balance',
				value: 'getBalance',
				action: 'Get token balance',
				description: 'Get the user token balance',
				routing: {
					request: {
						method: 'GET',
						url: '/user/balance',
						headers: {
							'Authorization': '=Bearer {{$credentials.apiKey}}',
						},
					},
				},
			},
		],
		default: 'getBalance',
	},
];

// Here we define any fields that are needed for user operations
export const userFields: INodeProperties[] = [];
