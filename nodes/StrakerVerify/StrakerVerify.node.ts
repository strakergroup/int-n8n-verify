import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
	NodeConnectionType,
	NodeApiError,
} from 'n8n-workflow';
import {
	languageOperations,
	languageFields,
	keyOperations,
	keyFields,
	projectOperations,
	projectFields,
	userOperations,
	userFields,
	workflowOperations,
	workflowFields,
	evaluationJobOperations,
	evaluationJobFields,
} from './descriptions';

// Project operations
async function projectGetAll(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/project`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

async function projectGet(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	const projectId = this.getNodeParameter('projectId', i) as string;

	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/project/${projectId}`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

async function projectCreate(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	items: INodeExecutionData[],
	credentials: IDataObject,
): Promise<any> {
	// Get parameters
	const title = this.getNodeParameter('title', i) as string;
	const languages = this.getNodeParameter('languages', i) as string;
	const workflowId = this.getNodeParameter('workflowId', i) as string;
	const confirmationRequired = this.getNodeParameter('confirmationRequired', i) as boolean;
	const binaryPropertyName = this.getNodeParameter('files', i) as string;

	// Check binary data exists
	if (items[i].binary === undefined) {
		throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
			itemIndex: i,
		});
	}

	const binaryData = items[i].binary![binaryPropertyName];
	if (binaryData === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			`No binary data property "${binaryPropertyName}" does not exists on item!`,
			{ itemIndex: i },
		);
	}

	// Manual approach using multipart form-data
	// FormData isn't available in Node.js natively, use the form-data package
	const FormData = require('form-data');
	const form = new FormData();

	// Add basic fields
	form.append('title', title);
	form.append('languages', languages);
	form.append('confirmation_required', confirmationRequired ? 'true' : 'false');

	if (workflowId) {
		form.append('workflow_id', workflowId);
	}

	// Add the file
	// Convert base64 data to a buffer and append to form
	const fileBuffer = Buffer.from(binaryData.data, 'base64');
	form.append('files', fileBuffer, {
		filename: binaryData.fileName || 'file',
		contentType: binaryData.mimeType,
	});

	// Get API key from credentials
	const apiKey = credentials.apiKey as string;

	// Set up headers with authentication
	const headers = {
		...form.getHeaders(),
		Authorization: `Bearer ${apiKey}`,
	};

	try {
		// Make the request
		const response = await this.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}/project`,
			body: form,
			headers,
		});

		// Ensure we always return an object even if response is empty
		const responseData = response || { success: true };

		// Return the response data
		return responseData;
	} catch (error) {
		// Log error for debugging
		console.error('API Error:', error);

		// Properly format error for n8n
		if (error.response) {
			throw new NodeApiError(this.getNode(), error, {
				message: `Request failed with status code ${error.response.status}: ${JSON.stringify(error.response.data)}`,
			});
		}
		throw error;
	}
}

async function projectConfirm(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	const projectId = this.getNodeParameter('projectId', i) as string;

	return await this.helpers.httpRequest({
		method: 'POST',
		url: `${baseUrl}/project/confirm`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/json',
		},
		body: {
			projectId,
		},
	});
}

async function projectGetSegments(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	const projectId = this.getNodeParameter('projectId', i) as string;
	const fileId = this.getNodeParameter('fileId', i) as string;
	const languageId = this.getNodeParameter('languageId', i) as string;

	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/project/${projectId}/segments/${fileId}/${languageId}`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

// Language operations
async function languageGetAll(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/languages`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

// Key operations
async function keyGet(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/key`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

async function keyCreate(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	const name = this.getNodeParameter('name', i) as string;
	const role = this.getNodeParameter('role', i) as string;

	return await this.helpers.httpRequest({
		method: 'POST',
		url: `${baseUrl}/key`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/json',
		},
		body: {
			name,
			role,
		},
	});
}

async function keyDelete(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	const keyId = this.getNodeParameter('keyId', i) as string;

	return await this.helpers.httpRequest({
		method: 'DELETE',
		url: `${baseUrl}/key/${keyId}`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

// User operations
async function userGetMe(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/user/balance`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

// Workflow operations
async function workflowGetAll(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/workflow`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

async function workflowGetOne(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<any> {
	const workflowId = this.getNodeParameter('workflowId', i) as string;

	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/workflow/${workflowId}`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

// Evaluation Job operations
async function evaluationJobCreate(
	this: IExecuteFunctions,
	i: number,
	privateBaseUrl: string,
	items: INodeExecutionData[],
	credentials: IDataObject,
): Promise<any> {
	// Get parameters
	const targetLanguages = this.getNodeParameter('targetLanguages', i) as string;
	const title = this.getNodeParameter('title', i) as string;
	const workflowId = this.getNodeParameter('workflowId', i) as string;
	const source = this.getNodeParameter('source', i) as string;
	const apiKey = this.getNodeParameter('apiKey', i) as string;
	const confirmationRequired = this.getNodeParameter('confirmationRequired', i) as boolean;
	const binaryPropertyName = this.getNodeParameter('files', i) as string;

	// Check binary data exists
	if (items[i].binary === undefined) {
		throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
			itemIndex: i,
		});
	}

	// Process multiple files if binaryPropertyName contains commas
	const binaryProperties = binaryPropertyName.split(',').map(property => property.trim());

	// Create FormData for multipart request
	const FormData = require('form-data');
	const form = new FormData();

	// Add text fields to form
	if (title) {
		form.append('title', title);
	}

	// Split target languages by comma and add each as a separate form field
	const languageArray = targetLanguages.split(',').map(lang => lang.trim());
	for (const lang of languageArray) {
		form.append('target_languages', lang);
	}

	if (workflowId) {
		form.append('workflow', workflowId);
	}

	form.append('source', source);

	if (apiKey) {
		form.append('api_key', apiKey);
	}

	form.append('confirmation_required', confirmationRequired ? 'true' : 'false');

	// Add files to form
	for (const property of binaryProperties) {
		const binaryData = items[i].binary![property];
		if (binaryData === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				`No binary data property "${property}" does not exists on item!`,
				{ itemIndex: i },
			);
		}

		// Convert base64 data to a buffer and append to form
		const fileBuffer = Buffer.from(binaryData.data, 'base64');
		form.append('files', fileBuffer, {
			filename: binaryData.fileName || 'file',
			contentType: binaryData.mimeType,
		});
	}

	// Set up headers with authentication
	const headers = {
		...form.getHeaders(),
		Authorization: `Bearer ${credentials.apiKey}`,
	};

	try {
		// Make the request
		const response = await this.helpers.httpRequest({
			method: 'POST',
			url: `${privateBaseUrl}/evaluate/create`,
			body: form,
			headers,
		});

		// Return the response data
		return response;
	} catch (error) {
		// Log error for debugging
		console.error('API Error:', error);

		// Properly format error for n8n
		if (error.response) {
			throw new NodeApiError(this.getNode(), error, {
				message: `Request failed with status code ${error.response.status}: ${JSON.stringify(error.response.data)}`,
			});
		}
		throw error;
	}
}

export class StrakerVerify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Straker Verify',
		name: 'strakerVerify',
		icon: 'file:strakerverify.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Straker Verify API',
		defaults: {
			name: 'Straker Verify',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [NodeConnectionType.Main],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'strakerVerifyApi',
				required: true,
			},
		],
		properties: [
			// Main resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Evaluation Job',
						value: 'evaluationJob',
					},
					{
						name: 'Key',
						value: 'key',
					},
					{
						name: 'Language',
						value: 'language',
					},
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Workflow',
						value: 'workflow',
					},
				],
				default: 'project',
			},

			// Language operations
			...languageOperations,
			...languageFields,

			// Key operations
			...keyOperations,
			...keyFields,

			// Project operations
			...projectOperations,
			...projectFields,

			// User operations
			...userOperations,
			...userFields,

			// Workflow operations
			...workflowOperations,
			...workflowFields,

			// Add the operations for evaluation job resource
			...evaluationJobOperations,
			...evaluationJobFields,
		],
	};

	// Main execution method
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('strakerVerifyApi');
		const baseUrl = (credentials.baseUrl as string) || 'http://localhost:11001';
		const privateBaseUrl = (credentials.privateBaseUrl as string) || 'http://localhost:11001';

		// Process each item
		for (let i = 0; i < items.length; i++) {
			try {
				let responseData;

				// Use switch statements to route to the appropriate resource handler
				switch (resource) {
					case 'project':
						// Handle project operations with a switch statement
						switch (operation) {
							case 'getAll':
								responseData = await projectGetAll.call(this, i, baseUrl, credentials);
								break;
							case 'get':
								responseData = await projectGet.call(this, i, baseUrl, credentials);
								break;
							case 'create':
								responseData = await projectCreate.call(this, i, baseUrl, items, credentials);
								break;
							case 'confirm':
								responseData = await projectConfirm.call(this, i, baseUrl, credentials);
								break;
							case 'getSegments':
								responseData = await projectGetSegments.call(this, i, baseUrl, credentials);
								break;
							default:
								throw new NodeOperationError(
									this.getNode(),
									`The operation "${operation}" is not supported for resource "project"!`,
								);
						}
						break;

					case 'language':
						// Handle language operations with a switch statement
						switch (operation) {
							case 'getAll':
								responseData = await languageGetAll.call(this, i, baseUrl, credentials);
								break;
							default:
								throw new NodeOperationError(
									this.getNode(),
									`The operation "${operation}" is not supported for resource "language"!`,
								);
						}
						break;

					case 'key':
						// Handle key operations with a switch statement
						switch (operation) {
							case 'get':
								responseData = await keyGet.call(this, i, baseUrl, credentials);
								break;
							case 'create':
								responseData = await keyCreate.call(this, i, baseUrl, credentials);
								break;
							case 'delete':
								responseData = await keyDelete.call(this, i, baseUrl, credentials);
								break;
							default:
								throw new NodeOperationError(
									this.getNode(),
									`The operation "${operation}" is not supported for resource "key"!`,
								);
						}
						break;

					case 'user':
						// Handle user operations with a switch statement
						switch (operation) {
							case 'me':
								responseData = await userGetMe.call(this, i, baseUrl, credentials);
								break;
							default:
								throw new NodeOperationError(
									this.getNode(),
									`The operation "${operation}" is not supported for resource "user"!`,
								);
						}
						break;

					case 'workflow':
						// Handle workflow operations with a switch statement
						switch (operation) {
							case 'getAll':
								responseData = await workflowGetAll.call(this, i, baseUrl, credentials);
								break;
							case 'getOne':
								responseData = await workflowGetOne.call(this, i, baseUrl, credentials);
								break;
							default:
								throw new NodeOperationError(
									this.getNode(),
									`The operation "${operation}" is not supported for resource "workflow"!`,
								);
						}
						break;

					case 'evaluationJob':
						// Handle evaluation job operations with a switch statement
						switch (operation) {
							case 'create':
								responseData = await evaluationJobCreate.call(this, i, privateBaseUrl, items, credentials);
								break;
							default:
								throw new NodeOperationError(
									this.getNode(),
									`The operation "${operation}" is not supported for resource "evaluationJob"!`,
								);
						}
						break;

					default:
						throw new NodeOperationError(
							this.getNode(),
							`The resource "${resource}" is not supported!`,
						);
				}

				returnData.push({
					json: responseData,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
