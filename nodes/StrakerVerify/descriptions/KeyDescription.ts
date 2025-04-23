import { INodeProperties } from 'n8n-workflow';

// When the resource 'key' is selected, this 'operation' parameter will be shown.
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
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an API key',
				description: 'Delete an API key',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get API keys',
				description: 'Get all API keys',
			},
		],
		default: 'get',
	},
];

// Here we define any fields that are needed for key operations
export const keyFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['key'],
				operation: ['create'],
			},
		},
		description: 'The name of the API key',
	},
	{
		displayName: 'Role',
		name: 'role',
		type: 'options',
		required: true,
		default: 'USER',
		options: [
			{
				name: 'Admin',
				value: 'ADMIN',
			},
			{
				name: 'User',
				value: 'USER',
			},
		],
		displayOptions: {
			show: {
				resource: ['key'],
				operation: ['create'],
			},
		},
		description: 'The role to assign to the API key',
	},
	{
		displayName: 'Key ID',
		name: 'keyId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['key'],
				operation: ['delete'],
			},
		},
		description: 'The ID of the API key to delete',
	},
];

