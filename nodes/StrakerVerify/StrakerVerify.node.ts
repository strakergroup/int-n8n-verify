import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	ICredentialDataDecryptedObject,
	NodeConnectionType,
	NodeApiError,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IBinaryData,
	sleep
} from 'n8n-workflow';
import {
	keyOperations,
	keyFields,
	projectOperations,
	projectFields,
	userOperations,
	userFields,
	fileOperations,
	fileFields,
} from './descriptions';
import { Language, ProjectCreateApiResponse, ProjectGetResponse, Workflow } from './types';

// Project operations
async function projectGetAll(
	this: IExecuteFunctions,
	i: number,

	credentials: ICredentialDataDecryptedObject,
): Promise<any> {
	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${credentials.environment}/project`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

async function projectGet(
	this: IExecuteFunctions,
	i: number,

	credentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const projectId = this.getNodeParameter('projectId', i) as string;

	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${credentials.environment}/project/${projectId}`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}


async function projectConfirmWithRetry(
	this: IExecuteFunctions,
	i: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const projectId = this.getNodeParameter('projectId', i) as string;
	const maxRetries = this.getNodeParameter('maxRetries', i, 10) as number;
	const waitSeconds = this.getNodeParameter('waitSeconds', i, 10) as number;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		const statusInfo = await projectGet.call(this, i, credentials) as ProjectGetResponse;
		const status = statusInfo.data.status as string;

		if (status === 'FAILED')
			throw new NodeOperationError(this.getNode(), 'Project status is FAILED.');

		if (status === 'COMPLETED')
			throw new NodeOperationError(this.getNode(), 'Project already COMPLETED, no confirmation needed.');

		if (status === 'PENDING_TOKEN_PAYMENT') {
			// Ensure user has enough balance
			const me = await userGetMe.call(this, i, credentials);
			const balance = me.balance as number | undefined;
			if (balance === undefined)
				throw new NodeOperationError(this.getNode(), 'Unable to retrieve user balance.');
			if (balance < (statusInfo.token_cost ?? 0))
				throw new NodeOperationError(
					this.getNode(),
					`Insufficient token balance. Required: ${statusInfo.token_cost}, Available: ${balance}`,
				);

			// Attempt confirmation once balance ok
			return await projectConfirm.call(this, i, credentials, projectId);
		}

		// Wait and retry if status not ready yet
		if (attempt < maxRetries - 1) await sleep(waitSeconds * 1000);
	}
	throw new NodeOperationError(
		this.getNode(),
		`Status never reached PENDING_TOKEN_PAYMENT after ${maxRetries} retries.`,
	);
}

export async function projectCreate(
	this: IExecuteFunctions,
	i: number,

	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData[]> {
	const binaryProp   = this.getNodeParameter('binaryProperty', i, 'data') as string;
	const languagesArr = this.getNodeParameter('languages',      i)         as string[];
	const workflowId   = this.getNodeParameter('workflowId',     i)         as string;
	const callbackUrl  = this.getNodeParameter('callbackUrl',    i, '')     as string;
	const title        = this.getNodeParameter('title',          i)         as string;

	if (!languagesArr.length)
		throw new NodeOperationError(this.getNode(), 'At least one language is required.');

	const items = this.getInputData();
	const form  = new FormData();

	// 1. Append files
	for (let fileItemIndex = 0; fileItemIndex < items.length; fileItemIndex++) {
		const bin = items[fileItemIndex].binary?.[binaryProp] as IBinaryData | undefined;
		if (!bin)
			throw new NodeOperationError(
				this.getNode(),
				`Item ${fileItemIndex} is missing binary property "${binaryProp}".`,
				{ itemIndex: fileItemIndex },
			);

		const buf = await this.helpers.getBinaryDataBuffer(fileItemIndex, binaryProp);
		const filename = bin.fileName  ?? `file_${fileItemIndex}_${binaryProp}`;
		const contentType = bin.mimeType  ?? 'application/octet-stream';
		const blob = new Blob([buf], { type: contentType });

		form.append('files', blob, filename);
	}

	// 2. Append languages
	for (const lng of languagesArr) form.append('languages', lng);

	// 3. Append title
	form.append('title', title);

	// 4. Append workflow_id
	form.append('workflow_id', workflowId);

	// 5. Append callback_uri
	form.append('callback_uri', callbackUrl);

	// 6. Append confirmation_required
	form.append('confirmation_required', 'true');

	const url = `${credentials.environment}/project?app_source=n8n`;

	/* 3 · POST /project */
	const creation = await this.helpers.httpRequest({
		method: 'POST',
		url,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
			'Content-Type': 'multipart/form-data',
		},
		body: form,
	}) as ProjectCreateApiResponse;

	// Log the initial creation response
	this.logger.debug('Initial project creation API response:', { creationResponse: creation });

	/**
	 * Each node action should perform exactly ONE HTTP request.
	 * The previous implementation chained multiple requests (polling for status,
	 * balance check, project confirmation, etc.).
	 * We now return the raw creation response and let the workflow author decide
	 * whether to trigger follow-up actions (e.g. confirm project) in subsequent
	 * node executions.
	 */
	// Using a wrapper object to satisfy IDataObject requirement
	return this.helpers.returnJsonArray({ creation });
}


async function projectConfirm(
	this: IExecuteFunctions,
	_i: number,
	credentials: ICredentialDataDecryptedObject,
	projectIdToConfirm: string,
): Promise<any> {

	try {
		const form = new FormData();
		form.append('project_id', projectIdToConfirm);

		const response = await this.helpers.httpRequest({
			method: 'POST',
			url: `${credentials.environment}/project/confirm`,
			headers: {
				Authorization: `Bearer ${credentials.apiKey}`,
			},
			body: form,
		});
		return {
			message: response,
		};
	} catch (error) {
		throw new NodeApiError(this.getNode(), error, {
			message: error.message,
		});
	}
}

async function projectGetSegments(
	this: IExecuteFunctions,
	i: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const projectId = this.getNodeParameter('projectId', i) as string;
	const fileId = this.getNodeParameter('fileId', i) as string;
	const languageId = this.getNodeParameter('languageId', i) as string;

	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${credentials.environment}/project/${projectId}/segments/${fileId}/${languageId}`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

// Key operations
async function keyGet(
	this: IExecuteFunctions,
	i: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<any> {
	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${credentials.environment}/key`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

async function keyCreate(
	this: IExecuteFunctions,
	i: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const name = this.getNodeParameter('name', i) as string;
	const role = this.getNodeParameter('role', i) as string;

	return await this.helpers.httpRequest({
		method: 'POST',
		url: `${credentials.environment}/key`,
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
	credentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const keyId = this.getNodeParameter('keyId', i) as string;

	return await this.helpers.httpRequest({
		method: 'DELETE',
		url: `${credentials.environment}/key/${keyId}`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	});
}

// User operations
async function userGetMe(
	this: IExecuteFunctions,
	i: number,
	credentials: ICredentialDataDecryptedObject,
): Promise<any> {
	return await this.helpers.httpRequest({
		method: 'GET',
		url: `${credentials.environment}/user/balance`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
			'Accept': 'application/json',
		},
	});
}

// File operations
async function fileGet(
	this: IExecuteFunctions,
	i: number,
	_items: INodeExecutionData[],
	credentials: ICredentialDataDecryptedObject,
): Promise<INodeExecutionData> {
	const fileId = this.getNodeParameter('fileId', i) as string;

	try {
		// Make a simple request to get the file
		const response = await this.helpers.request({
			method: 'GET',
			uri: `${credentials.environment}/file/${fileId}`,
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${credentials.apiKey}`,
			},
			encoding: null,
			resolveWithFullResponse: true,
		});

		if (response.statusCode !== 200) {
			throw new NodeOperationError(
				this.getNode(),
				`Request failed with status code ${response.statusCode}`,
			);
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
		// Log error for debugging, without including potential binary data
		this.logger.error('File API Error:', error.message || 'Unknown error');

		// Properly format error for n8n
		if (error.response) {
			throw new NodeApiError(this.getNode(), error, {
				message: `Request failed with status code ${error.response.status}`,
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

			// Key operations
			...keyOperations,
			...keyFields,

			// Project operations
			...projectOperations,
			...projectFields,

			// User operations
			...userOperations,
			...userFields,

			// // Workflow operations
			// ...workflowOperations,
			// ...workflowFields,

			// File operations
			...fileOperations,
			...fileFields,
		],
	};

	// Add a methods object for loadOptions
	methods = {
		loadOptions: {
			async getWorkflows(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				this.logger.debug('Attempting to load workflows...');
				const credentials = await this.getCredentials('strakerVerifyApi');
				const apiKey = (credentials.apiKey as string) || '';
				this.logger.debug(`API Key for workflows: ${apiKey ? 'Loaded' : 'MISSING'}`);

				try {
					const response = (await this.helpers.httpRequest({
						method: 'GET',
						url: `${credentials.environment}/workflow`,
						headers: {
							Authorization: `Bearer ${apiKey}`,
						},
					})) as { workflows: Array<Workflow> }; // Added type assertion
					this.logger.debug('Raw workflows API response:', { data: response });

					const workflowsArray = response.workflows; // Access the nested array

					if (Array.isArray(workflowsArray)) {
						const mappedWorkflows = workflowsArray
							.map((workflow) => ({
								name: workflow.name,
								value: workflow.id,
							}))
							.sort((a, b) => a.name.localeCompare(b.name));
						this.logger.debug('Mapped workflows:', { data: mappedWorkflows });
						return mappedWorkflows;
					}
					this.logger.warn('Workflows data (inside response.workflows) was not an array.', {
						response,
					});
					return [];
				} catch (error) {
					this.logger.error('Error loading workflows:', {
						error: error.message,
						stack: error.stack,
					});
					return [];
				}
			},
			async getLanguages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				this.logger.debug('Attempting to load languages...');
				const credentials = await this.getCredentials('strakerVerifyApi');
				const apiKey = (credentials.apiKey as string) || '';
				this.logger.debug(`API Key for languages: ${apiKey ? 'Loaded' : 'MISSING'}`);

				try {
					const response = (await this.helpers.httpRequest({
						method: 'GET',
						url: `${credentials.environment}/languages`,
						headers: {
							Authorization: `Bearer ${apiKey}`,
						},
					})) as { data: Array<Language> }; // Added type assertion
					this.logger.debug('Raw languages API response:', { data: response });

					const languagesArray = response.data;

					if (Array.isArray(languagesArray)) {
						const mappedLanguages = languagesArray
							.map((language) => ({
								name: language.name,
								value: language.id,
							}))
							.sort((a, b) => a.name.localeCompare(b.name));
						this.logger.debug('Mapped languages:', { data: mappedLanguages });
						return mappedLanguages;
					}
					this.logger.warn('Languages data (inside response.data) was not an array.', { response });
					return [];
				} catch (error) {
					this.logger.error('Error loading languages:', {
						error: error.message,
						stack: error.stack,
					});
					return [];
				}
			},
		},
	};

	// Main execution method
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('strakerVerifyApi');
		// Determine base URL from credentials (environment selection) or fallback to default

		this.logger.debug('===== DEBUG: Node Execution Start =====');
		this.logger.debug(
			`Resource: ${resource}, Operation: ${operation}, Input Items: ${items.length}`,
		);

		if (resource === 'project' && operation === 'create') {
			this.logger.debug('Executing projectCreate once for all items.');
			try {
				// Call projectCreate once. It uses itemIndex 0 for shared NodeParameters
				// and this.getInputData() internally to gather all files.
				const projectCreateResult = await projectCreate.call(this, 0, credentials);
				// projectCreateResult is INodeExecutionData[] (usually one item: {json: apiResponse})
				returnData = projectCreateResult;
				this.logger.debug('projectCreate successful', { responseDataCount: returnData.length });
			} catch (error) {
				this.logger.error('Error during single projectCreate call:', {
					message: error.message,
					stack: error.stack,
				});
				if (this.continueOnFail()) {
					// Provide a single error output for the failed batch operation
					returnData.push({ json: { error: error.message }, pairedItem: { item: 0 } }); // Or no pairedItem
				} else {
					throw error;
				}
			}
		} else {
			this.logger.debug(`Executing operation item by item for ${items.length} items.`);
			// Process each item for other operations
			for (let i = 0; i < items.length; i++) {
				this.logger.debug(`Processing item ${i} for ${resource}/${operation}`);
				try {
					let responseData;
					let singleItemExecutionData: INodeExecutionData | null = null;

					switch (resource) {
						case 'project':
							switch (operation) {
								// 'create' is handled above
								case 'getAll':
									responseData = await projectGetAll.call(this, i, credentials);
									break;
								case 'get':
									responseData = await projectGet.call(this, i, credentials);
									break;
								case 'confirm':
									// For the general 'confirm' operation (not the one inside projectCreate)
									// it should still get projectId from parameters.
									responseData = await projectConfirmWithRetry.call(
										this,
										i,
										credentials,
									);
									break;
								case 'getSegments':
									responseData = await projectGetSegments.call(this, i, credentials);
									break;
								default:
									throw new NodeOperationError(
										this.getNode(),
										`The operation "${operation}" is not supported for resource "project" here or was already handled.`,
										{ itemIndex: i },
									);
							}
							break;
						case 'key':
							switch (operation) {
								case 'get':
									responseData = await keyGet.call(this, i, credentials);
									break;
								case 'create':
									responseData = await keyCreate.call(this, i, credentials);
									break;
								case 'delete':
									responseData = await keyDelete.call(this, i, credentials);
									break;
								default:
									throw new NodeOperationError(
										this.getNode(),
										`The operation "${operation}" is not supported for resource "key"!`,
										{ itemIndex: i },
									);
							}
							break;
						case 'user':
							switch (operation) {
								case 'me':
									responseData = await userGetMe.call(this, i, credentials);
									break;
								default:
									throw new NodeOperationError(
										this.getNode(),
										`The operation "${operation}" is not supported for resource "user"!`,
										{ itemIndex: i },
									);
							}
							break;
						case 'file':
							switch (operation) {
								case 'get':
									// fileGet takes _items: INodeExecutionData[], which it might use for context if needed,
									// but primarily uses 'i' for node parameters specific to the item context.
									singleItemExecutionData = await fileGet.call(
										this,
										i,
										items,
										credentials,
									);
									break;
								default:
									throw new NodeOperationError(
										this.getNode(),
										`The operation "${operation}" is not supported for resource "file"!`,
										{ itemIndex: i },
									);
							}
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`The resource "${resource}" is not supported!`,
								{ itemIndex: i },
							);
					}

					if (singleItemExecutionData) {
						returnData.push(singleItemExecutionData);
					} else if (responseData !== undefined) {
						// Check if responseData is already INodeExecutionData[] (some helpers might do this)
						if (
							Array.isArray(responseData) &&
							responseData.length > 0 &&
							typeof responseData[0] === 'object' &&
							responseData[0] !== null &&
							'json' in responseData[0]
						) {
							// If it's already in the expected format (array of INodeExecutionData-like objects)
							returnData.push(
								...responseData.map((data) => ({ ...data, pairedItem: { item: i } })),
							);
						} else {
							// Otherwise, wrap it as standard { json: responseData }
							returnData.push({ json: responseData, pairedItem: { item: i } });
						}
					} else {
						this.logger.warn(
							`No response data or execution data produced for item ${i}, resource "${resource}", operation "${operation}"`,
						);
					}
				} catch (error) {
					this.logger.error(`Error processing item ${i} for ${resource}/${operation}:`, {
						message: error.message,
						stack: error.stack,
					});
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
							},
							pairedItem: { item: i },
						});
						continue;
					}
					throw error;
				}
			}
		}
		this.logger.debug('===== DEBUG: Node Execution End =====');
		return [returnData];
	}
}
