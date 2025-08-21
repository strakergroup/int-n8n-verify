import { INodeProperties } from 'n8n-workflow';

// When the resource 'project' is selected, this 'operation' parameter will be shown.
export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['project'],
			},
		},
		options: [
			{
				name: 'Confirm',
				value: 'confirm',
				action: 'Confirm a project',
				description: 'Confirm a project that is pending payment',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a project with file upload',
				description: 'Create a new project with file upload. This action only sends the initial create request; use "Confirm" to approve payment afterwards.',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a project',
				description: 'Get a specific project',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many projects',
				description: 'Get many projects',
			},
			{
				name: 'Get Segments',
				value: 'getSegments',
				action: 'Get project segments',
				description: 'Retrieve segments of a specific project',
			},
		],
		default: 'getAll',
	},
];

// Here we define any fields that are needed for project operations
export const projectFields: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['get', 'confirm', 'getSegments'],
			},
		},
		description: 'The ID of the project',
	},
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['getSegments'],
			},
		},
		description: 'The ID of the file to get segments from',
	},
	{
		displayName: 'Language ID',
		name: 'languageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['getSegments'],
			},
		},
		description: 'The ID of the language for the segments',
	},
	{
		displayName: 'Project Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		description: 'Title of the project',
	},
	{
		displayName: 'Language Names or IDs',
		name: 'languages',
		type: 'multiOptions',
		required: true,
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getLanguages',
		},
		default: [],
		description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Workflow Name or ID',
		name: 'workflowId',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getWorkflows',
		},
		default: '',
		required: true,
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		description: "The name of the property within the input item's binary data that holds the array of file objects (e.g., 'binary' if the files are in item.binary.binary)",
	},
	{
		displayName: 'Callback URL',
		name: 'callbackUrl',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		description: 'The URL to send the callback to once the project is completed',
	},
	{
		displayName: 'Max Retries',
		name: 'maxRetries',
		type: 'number',
		default: 6,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['confirm'],
			},
		},
		description: 'Number of times to poll project status before giving up',
	},
	{
		displayName: 'Wait Between Retries (Seconds)',
		name: 'waitSeconds',
		type: 'number',
		default: 10,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['confirm'],
			},
		},
		description: 'Seconds to wait between status checks',
	},
];
