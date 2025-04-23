import { INodeProperties } from 'n8n-workflow';

// When the resource 'evaluationJob' is selected, this 'operation' parameter will be shown.
export const evaluationJobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['evaluationJob'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an evaluation job',
				description: 'Create a new evaluation job with file upload',
			},
		],
		default: 'create',
	},
];

// Here we define any fields that are needed for evaluation job operations
export const evaluationJobFields: INodeProperties[] = [
	{
		displayName: 'Target Languages',
		name: 'targetLanguages',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['evaluationJob'],
				operation: ['create'],
			},
		},
		description: 'Comma-separated UUIDs of target languages (e.g. "917FF728-0725-A033-1278-33025F49CA40")',
	},
	{
		displayName: 'Files',
		name: 'files',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['evaluationJob'],
				operation: ['create'],
			},
		},
		description: 'Binary property name(s) to send (e.g. "data" or "data,files")',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['evaluationJob'],
				operation: ['create'],
			},
		},
		description: 'Title of the evaluation job',
	},
	{
		displayName: 'Workflow ID',
		name: 'workflowId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['evaluationJob'],
				operation: ['create'],
			},
		},
		description: 'UUID of the workflow to use',
	},
	{
		displayName: 'Source',
		name: 'source',
		type: 'string',
		default: 'verify',
		displayOptions: {
			show: {
				resource: ['evaluationJob'],
				operation: ['create'],
			},
		},
		description: 'Application the request has originated from',
	},
	{
		displayName: 'API Key',
		name: 'apiKey',
		type: 'string',
		default: '',
		typeOptions: {
			password: true,
		},
		displayOptions: {
			show: {
				resource: ['evaluationJob'],
				operation: ['create'],
			},
		},
		description: 'API key to use for the request',
	},
	{
		displayName: 'Confirmation Required',
		name: 'confirmationRequired',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['evaluationJob'],
				operation: ['create'],
			},
		},
		description: 'Whether confirmation is required for the evaluation job',
	},
];
