import { INodeProperties } from 'n8n-workflow';

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
				name: 'Create',
				value: 'create',
				description: 'Create a new Verify project',
				action: 'Create a new project',
			},
			{
				name: 'Download Files',
				value: 'downloadFiles',
				description: 'Download translated files for a project',
				action: 'Download translated files',
			},
		],
		default: 'create',
	},
];

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
				name: 'List',
				value: 'list',
				description: 'List all available languages',
				action: 'List available languages',
			},
		],
		default: 'list',
	},
];

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
				name: 'List',
				value: 'list',
				description: 'List all available workflows',
				action: 'List available workflows',
			},
		],
		default: 'list',
	},
];

// ===== PROJECT FIELDS =====
const createProjectFields: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The title of the project (max 255 characters)',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		default: 'data',
		placeholder: 'data',
		description:
			'Specify the name of the binary property that holds the file data from the previous node',
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
		name: 'workflow',
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
		displayName: 'Callback URI',
		name: 'callbackUri',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Get this value from the "Webhook" node',
	},
	{
		displayName: 'Client Notes',
		name: 'clientNotes',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Optional notes for the client (max 255 characters)',
	},
];

const downloadProjectFilesFields: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['downloadFiles'],
			},
		},
		default: '={{ $json.body.job_uuid }}',
		description: 'The ID of the project to download files from',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['downloadFiles'],
			},
		},
		default: 'data',
		description: 'Name of the binary property to store the downloaded file data',
	},
];

export const projectFields: INodeProperties[] = [
	...createProjectFields,
	...downloadProjectFilesFields,
];

