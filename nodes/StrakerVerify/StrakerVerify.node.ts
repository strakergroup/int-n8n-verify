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


// Helper function for delay
async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function waitForPendingPayment(
	this: IExecuteFunctions,
	projectId: string,
	credentials: ICredentialDataDecryptedObject,
	maxRetries = 6,
	pauseMs = 5_000,
) {
	let lastResponse: ProjectGetResponse | null = null;
	for (let n = 0; n < maxRetries; n++) {
		const res = await this.helpers.httpRequest({
			method: 'GET',
			url: `${credentials.environment}/project/${projectId}`,
			headers: { Authorization: `Bearer ${credentials.apiKey}` },
		}) as ProjectGetResponse;
		// If status is PENDING_TOKEN_PAYMENT or already COMPLETED, return the response
		if (res.data.status === 'PENDING_TOKEN_PAYMENT') {
			this.logger.debug(`waitForPendingPayment: Exiting loop. Status is ${res.data.status}.`, { projectDetails: res.data });
			return res;
		}
		lastResponse = res; // Store the last response
		await delay(pauseMs);
	}
	// If loop finishes, status was not reached
	this.logger.error('waitForPendingPayment timeout. Last project details:', { projectDetails: lastResponse });
	throw new NodeOperationError(
		this.getNode(),
		`Status never reached PENDING_TOKEN_PAYMENT or COMPLETED after ${maxRetries} checks. Last status: ${lastResponse?.data?.status}`,
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
	const projectId = creation.project_id as string | undefined;

	// Log the initial creation response
	this.logger.debug('Initial project creation API response:', { creationResponse: creation });

	if (!projectId)
		throw new NodeOperationError(this.getNode(), 'Missing project_id in response.');

	/* 4 · Wait for PENDING_TOKEN_PAYMENT or COMPLETED */
	const pending = await waitForPendingPayment.call(
		this,
		projectId,
		credentials,
	);

	// If project is already COMPLETED, skip payment and confirmation
	if (pending.data.status === 'COMPLETED') {
		this.logger.debug('Project is already COMPLETED. Skipping balance check and confirmation.', { projectDetails: pending.data });
		return this.helpers.returnJsonArray({
			creation: {
				project_id: creation.project_id,
				message: creation.message,
				status: 'COMPLETED',
			},
			project_details: pending.data, // Return full project details as received
		});
	}

	// If PENDING_TOKEN_PAYMENT, proceed with token cost, balance check, and confirmation
	// Ensure token_cost is present when status is PENDING_TOKEN_PAYMENT
	const tokenCost = pending.token_cost as number | undefined;

	if (tokenCost === undefined) {
		this.logger.error('Token cost is undefined, but project status is PENDING_TOKEN_PAYMENT. This is unexpected.', { pendingResponse: pending });
		throw new NodeOperationError(this.getNode(), 'Token cost is unexpectedly undefined for a project pending payment. Project might have moved to a different state or API response is missing data.');
	}

	/* 5 · Balance check */
	const me      = await userGetMe.call(this, 0, credentials);
	const balance = me.balance as number | undefined;

	if (balance === undefined)
		return this.helpers.returnJsonArray({
			creation: {
				project_id: creation.project_id,
				message: creation.message,
			},
			pending: {
				data: pending.data,
				token_cost: pending.token_cost,
			},
			confirmation_status: 'missing_balance'
		});

	if (balance < tokenCost)
		return this.helpers.returnJsonArray({
			creation: {
				project_id: creation.project_id,
				message: creation.message,
			},
			balance,
			tokenCost
		});

	/* 6 · Confirm project */
	try {
		const confirmation_status = await projectConfirm.call(
			this,
			0,
			credentials,
			projectId,
		);
		return this.helpers.returnJsonArray({
			creation: {
				project_id: creation.project_id,
				message: creation.message,
			},
			confirmation_status,
		});
	} catch (error) {
		this.logger.error('Error confirming project:', { error });
		return this.helpers.returnJsonArray({
			creation: {
				project_id: creation.project_id,
				message: creation.message,
			},
			error: error.message,
		});
	}
}


async function projectConfirm(
	this: IExecuteFunctions,
	_i: number,
	credentials: ICredentialDataDecryptedObject,
	projectIdToConfirm: string,
): Promise<string> {

	const body = new URLSearchParams();
	body.append('project_id', projectIdToConfirm);

	const response = await this.helpers.httpRequest({
		method: 'POST',
		url: `${credentials.environment}/project/confirm`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: body.toString(),
	});

	return response.body;
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
									const projectIdToConfirm = this.getNodeParameter('projectId', i) as string;
									responseData = await projectConfirm.call(
										this,
										i,
										credentials,
										projectIdToConfirm,
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
