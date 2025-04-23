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
				description: 'Confirm a project',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a project with file upload',
				description: 'Create a new project with file upload',
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
		displayName: 'Title',
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
		displayName: 'Languages',
		name: 'languages',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		description: 'UUID of target language (e.g. "917FF728-0725-A033-1278-33025F49CA40")',
	},
	{
		displayName: 'Workflow ID',
		name: 'workflowId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		description: 'UUID of the workflow to use',
	},
	{
		displayName: 'Confirmation Required',
		name: 'confirmationRequired',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		description: 'Whether confirmation is required for the project',
	},
	{
		displayName: 'Files',
		name: 'files',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		description: 'Binary property name(s) to send (e.g. "data" or "data,files")'
	}
];
