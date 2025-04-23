import { INodeProperties } from 'n8n-workflow';

// When the resource 'workflow' is selected, this 'operation' parameter will be shown.
export const workflowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['workflow'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many workflows',
				description: 'Get a list of many workflows',
			},
			{
				name: 'Get One',
				value: 'getOne',
				action: 'Get one workflow',
				description: 'Get a single workflow by ID',
			},
		],
		default: 'getAll',
	},
];

// Here we define any fields that are needed for workflow operations
export const workflowFields: INodeProperties[] = [
	{
		displayName: 'Workflow ID',
		name: 'workflowId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['workflow'],
				operation: ['getOne'],
			},
		},
	},
];
