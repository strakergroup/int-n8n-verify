import { INodeProperties } from 'n8n-workflow';

// When the resource 'user' is selected, this 'operation' parameter will be shown.
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
				name: 'Get Current User',
				value: 'me',
				action: 'Get current user information',
				description: 'Get the currently authenticated user information',
			},
		],
		default: 'me',
	},
];

// Here we define any fields that are needed for user operations
export const userFields: INodeProperties[] = [];
