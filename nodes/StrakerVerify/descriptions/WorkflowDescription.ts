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
				name: 'Get',
				value: 'get',
				action: 'Get a workflow',
				description: 'Get a specific workflow',
				routing: {
					request: {
						method: 'GET',
						url: '/workflow/{{$parameter.workflowId}}',
						headers: {
							'Authorization': '=Bearer {{$credentials.apiKey}}',
						},
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many workflows',
				description: 'Get many available workflows',
				routing: {
					request: {
						method: 'GET',
						url: '/workflow',
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
				operation: ['get'],
			},
		},
		description: 'The ID of the workflow',
	},
];
