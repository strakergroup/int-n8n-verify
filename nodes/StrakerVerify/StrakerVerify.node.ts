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
	fileOperations,
	fileFields,
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

// File operations
async function fileGet(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	credentials: IDataObject,
): Promise<INodeExecutionData> {
	const fileId = this.getNodeParameter('fileId', i) as string;

	try {
		// Make a simple request to get the file
		const response = await this.helpers.request({
			method: 'GET',
			uri: `${baseUrl}/file/${fileId}`,
			headers: {
				Accept: '*/*',
				Authorization: `Bearer ${credentials.apiKey}`,
			},
			encoding: null,
			resolveWithFullResponse: true,
		});

		if (response.statusCode !== 200) {
			throw new NodeOperationError(this.getNode(), `Request failed with status code ${response.statusCode}`);
		}

		// Get content type from headers
		const contentType = response.headers['content-type'] || 'application/octet-stream';

		// Try to get filename from content-disposition header if available
		let fileName = `${fileId}.file`;
		const contentDisposition = response.headers['content-disposition'];
		if (contentDisposition) {
			const filenameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
			if (filenameMatch && filenameMatch[1]) {
				fileName = filenameMatch[1].replace(/['"]/g, '');
			}
		}

		// Create a proper binary data object
		const buffer = Buffer.from(response.body);
		const binaryData = await this.helpers.prepareBinaryData(buffer, fileName, contentType);

		// Return data in the n8n-compatible format
		return {
			json: {
				fileId,
				fileName,
				contentType,
			},
			binary: {
				data: binaryData,
			},
		};
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
						name: 'File',
						value: 'file',
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

			// File operations
			...fileOperations,
			...fileFields,
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

					case 'file':
						// Handle file operations with a switch statement
						switch (operation) {
							case 'get':
								// File get returns a complete INodeExecutionData with binary data
								returnData.push(await fileGet.call(this, i, baseUrl, credentials));
								continue; // Skip the standard returnData.push below
							default:
								throw new NodeOperationError(
									this.getNode(),
									`The operation "${operation}" is not supported for resource "file"!`,
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
