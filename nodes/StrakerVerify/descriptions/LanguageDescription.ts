import { INodeProperties } from 'n8n-workflow';

// When the resource 'language' is selected, this 'operation' parameter will be shown.
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
				description: 'Get a list of many available languages',
			},
		],
		default: 'getAll',
	},
];

// Here we define any fields that are needed for language operations
export const languageFields: INodeProperties[] = [];
