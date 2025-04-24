import { INodeProperties } from 'n8n-workflow';

// When the resource 'key' is selected, this 'operation' parameter will be shown.
export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get file',
				description: 'Get a file',
			},
		],
		default: 'get',
	},
];

// Here we define any fields that are needed for key operations
export const fileFields: INodeProperties[] = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['get'],
			},
		},
		description: 'The ID of the file to get',
	},
];
