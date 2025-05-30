import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
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

const BASE_URL = 'https://api-verify.straker.ai';

const PROJECT_DETAILS_MAX_RETRIES = 3; // Max number of retries to get project details
const PROJECT_DETAILS_RETRY_DELAY_MS = 3000; // Delay between retries in milliseconds (e.g., 3 seconds)

// Helper function for delay
async function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// Define interfaces for API responses
interface ProjectCreateApiResponse { // Updated based on user feedback
	project_id: string;
	message: string;
	// token_cost is NOT in this response anymore
}

// Interface for the 'data' part of GET /project/{id} response
interface ProjectDetailsData {
	uuid: string; // This is the project ID
	client_uuid?: string;
	title?: string;
	status: string;
	target_languages?: Array<any>; // Simplified for now
	source_files?: Array<any>; // Simplified for now
	archived?: boolean;
	callback_uri?: string;
	created_at?: string;
	modified_at?: string;
	// Add other fields from user's example if needed
}

// Interface for the full GET /project/{id} response
interface ProjectGetResponse {
	data: ProjectDetailsData;
	token_cost?: number; // Mark as optional, as it might not be present if status is IN_PROGRESS
}

interface UserBalanceResponse { // Assumed structure for /user/balance response
	balance: number;
	// This might be nested, e.g. { data: { balance: number } }
	// Adjust if the actual API response structure is different.
}

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
	credentials: IDataObject,
): Promise<INodeExecutionData[]> {
	/* 1 · Node parameters */
	const binaryProp   = this.getNodeParameter('binaryProperty', i, 'data') as string;
	const languagesArr = this.getNodeParameter('languages', i)             as string[];
	const workflowId   = this.getNodeParameter('workflowId', i)            as string;
	const callbackUrl  = this.getNodeParameter('callbackUrl', i, '')       as string;
	const title        = this.getNodeParameter('title', i)                 as string;

	if (languagesArr.length === 0)
		throw new NodeOperationError(this.getNode(), 'At least one language is required.');

	/* 2 · Build FormData payload for project creation */
	const formData = new FormData();

	formData.append('title', title);
	formData.append('workflow_id', workflowId);
	formData.append('confirmation_required', 'true'); // Project created requiring confirmation

	if (callbackUrl) {
		formData.append('callback_uri', callbackUrl);
	}

	for (const lang of languagesArr) {
		formData.append('languages', lang);
	}

	const items = this.getInputData();

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

		formData.append('files', blob, filename);
	}

	/* 3 · POST /project to create it */
	const creationApiResponse = await this.helpers.httpRequest(
		{
			method: 'POST',
			url:    `${baseUrl}/project?app_source=n8n`,
			headers: {
				Authorization: `Bearer ${credentials.apiKey}`,
			},
			body: formData,
		},
	) as ProjectCreateApiResponse; // Updated interface

	if (!creationApiResponse || !creationApiResponse.project_id) {
		this.logger.error('Invalid response from project creation API or missing project_id.', { creationApiResponse });
		throw new NodeOperationError(this.getNode(), 'Invalid response from project creation API or missing project_id.');
	}

	const newProjectId = creationApiResponse.project_id;
	this.logger.info(`Project creation initiated. API Message: "${creationApiResponse.message}". Project ID: ${newProjectId}. Fetching details for token cost.`);

	/* 4 · GET /project/{newProjectId} to fetch details including token_cost - with retries */
	let projectDetails: ProjectGetResponse | undefined;
	let tokenCost: number | undefined;
	let attempts = 0;
	let lastObservedStatus: string | undefined;

	while (attempts < PROJECT_DETAILS_MAX_RETRIES && tokenCost === undefined) {
		attempts++;
		try {
			this.logger.debug(`Attempt ${attempts}/${PROJECT_DETAILS_MAX_RETRIES} to fetch details for project ${newProjectId}...`);
			const currentDetails = await this.helpers.httpRequest({
				method: 'GET',
				url: `${baseUrl}/project/${newProjectId}`,
				headers: {
					Authorization: `Bearer ${credentials.apiKey}`,
					'Accept': 'application/json',
				},
			}) as ProjectGetResponse;

			projectDetails = currentDetails; // Store the latest details fetched
			console.log(`CONSOLE DEBUG (Attempt ${attempts}): Raw project details for ${newProjectId}:`, JSON.stringify(projectDetails, null, 2));

			if (projectDetails && projectDetails.data) {
				lastObservedStatus = projectDetails.data.status;
				if (typeof projectDetails.token_cost === 'number') {
					tokenCost = projectDetails.token_cost;
					this.logger.info(`Successfully fetched token_cost (${tokenCost}) for project ${newProjectId} on attempt ${attempts}. Status: '${lastObservedStatus}'.`);
					break; // Exit loop, token_cost found
				} else if (projectDetails.data.status === 'IN_PROGRESS' || projectDetails.data.status === 'PENDING_ANALYSIS') { // Add other relevant transient statuses if needed
					this.logger.warn(`Attempt ${attempts}/${PROJECT_DETAILS_MAX_RETRIES}: token_cost not yet available for project ${newProjectId}. Status: '${lastObservedStatus}'.`);
					if (attempts < PROJECT_DETAILS_MAX_RETRIES) {
						this.logger.info(`Retrying in ${PROJECT_DETAILS_RETRY_DELAY_MS / 1000}s...`);
						await delay(PROJECT_DETAILS_RETRY_DELAY_MS);
					}
				} else {
					// Status is not IN_PROGRESS/PENDING_ANALYSIS, and token_cost is still missing. Unlikely to appear with more retries.
					this.logger.warn(`Attempt ${attempts}/${PROJECT_DETAILS_MAX_RETRIES}: token_cost not available for project ${newProjectId}. Status: '${lastObservedStatus}'. Not a known transient status, will not retry further.`);
					break; // Exit loop
				}
			} else {
				// projectDetails or projectDetails.data is missing - this is unexpected
				this.logger.error(`Attempt ${attempts}/${PROJECT_DETAILS_MAX_RETRIES}: Invalid project details structure received for ${newProjectId}.`, { projectDetailsResponse: projectDetails });
				break; // Exit loop
			}
		} catch (getDetailsError) {
			this.logger.error(`Attempt ${attempts}/${PROJECT_DETAILS_MAX_RETRIES}: API error fetching project details for project ${newProjectId}:`, { message: getDetailsError.message, stack: getDetailsError.stack });
			if (attempts < PROJECT_DETAILS_MAX_RETRIES) {
				this.logger.info(`Retrying in ${PROJECT_DETAILS_RETRY_DELAY_MS / 1000}s...`);
				await delay(PROJECT_DETAILS_RETRY_DELAY_MS);
			} else {
				// Last attempt failed with an API error
				return this.helpers.returnJsonArray({
					creation_response: creationApiResponse,
					confirmation_status: 'api_error_fetching_project_details_after_retries',
					error_message: `API error fetching details for project ${newProjectId} after ${attempts} attempts: ${getDetailsError.message}`,
					attempt_details: { attempts, error: getDetailsError.message },
				});
			}
		}
	}

	// After the loop, check if tokenCost was successfully retrieved
	if (typeof tokenCost !== 'number' || !projectDetails || !projectDetails.data) {
		const finalStatus = projectDetails?.data?.status || lastObservedStatus || 'unknown';
		const errorMessage = `Failed to retrieve a valid 'token_cost' for project ${newProjectId} after ${attempts} attempts. Final observed status: '${finalStatus}'.`;
		this.logger.error(errorMessage, { projectDetailsResponse: projectDetails, attemptsMade: attempts });
		console.error(`CONSOLE ERROR: ${errorMessage} Last received details:`, JSON.stringify(projectDetails, null, 2));
		return this.helpers.returnJsonArray({
			creation_response: creationApiResponse,
			project_final_status: finalStatus,
			confirmation_status: 'failed_to_get_token_cost_after_retries',
			error_message: errorMessage,
			raw_project_details_last_attempt: projectDetails,
			attempts_made: attempts,
		});
	}

	// All good: projectDetails, projectDetails.data, and tokenCost are valid.
	this.logger.info(`Project ${newProjectId} details finalized. Token cost: ${tokenCost}. Status: '${projectDetails.data.status}'. Proceeding with balance check.`);

	/* 5 · Check balance and attempt confirmation */
	try {
		const balanceResponse = await userGetMe.call(this, i, baseUrl, credentials) as UserBalanceResponse;

		if (balanceResponse === null || typeof balanceResponse.balance !== 'number') {
			this.logger.warn(`Could not determine user balance for project ${newProjectId}. Project will not be confirmed by node.`, { balanceResponse });
			return this.helpers.returnJsonArray({
				creation_response: creationApiResponse,
				project_details: projectDetails,
				confirmation_status: 'failed_to_get_balance',
				error_message: 'Could not retrieve or parse user balance from API.',
			});
		}
		const userBalance = balanceResponse.balance;
		this.logger.debug(`User balance: ${userBalance}. Required for project ${newProjectId}: ${tokenCost}.`);

		if (userBalance >= tokenCost) {
			this.logger.info(`Sufficient balance (${userBalance}). Attempting to confirm project ${newProjectId} via node.`);
			try {
				const confirmationResponse = await projectConfirm.call(this, i, baseUrl, credentials, newProjectId);
				this.logger.info(`Project ${newProjectId} confirmed successfully by node.`);
				return this.helpers.returnJsonArray({
					creation_response: creationApiResponse,
					project_details: projectDetails,
					confirmation_status: 'confirmed_by_node',
					confirmation_api_response: confirmationResponse,
					user_balance_at_confirmation: userBalance,
				});
			} catch (confirmError) {
				this.logger.error(`Error during node attempt to confirm project ${newProjectId}:`, { message: confirmError.message, stack: confirmError.stack });
				return this.helpers.returnJsonArray({
					creation_response: creationApiResponse,
					project_details: projectDetails,
					confirmation_status: 'confirmation_failed_by_node_despite_sufficient_balance',
					confirmation_error: confirmError.message,
					user_balance_at_confirmation_attempt: userBalance,
				});
			}
		} else {
			this.logger.warn(`Insufficient balance (${userBalance}) for project ${newProjectId} (cost: ${tokenCost}). Project created but not confirmed by node.`);
			return this.helpers.returnJsonArray({
				creation_response: creationApiResponse,
				project_details: projectDetails,
				confirmation_status: 'skipped_insufficient_balance_node_check',
				user_balance: userBalance,
				required_tokens: tokenCost,
			});
		}
	} catch (balanceError) {
		this.logger.error(`Error fetching user balance for project ${newProjectId}:`, { message: balanceError.message, stack: balanceError.stack });
		return this.helpers.returnJsonArray({
			creation_response: creationApiResponse,
			project_details: projectDetails, // May be undefined if error was before fetching details
			confirmation_status: 'failed_to_get_balance_before_confirmation_attempt',
			error_message: `Error fetching user balance: ${balanceError.message}`,
		});
	}
}

async function projectConfirm(
	this: IExecuteFunctions,
	_i: number, // Item index i is not strictly needed here if projectIdToConfirm is passed
	baseUrl: string,
	credentials: IDataObject,
	projectIdToConfirm: string, // Added projectId as a direct argument
): Promise<any> {
	// const projectId = this.getNodeParameter('projectId', i) as string; // Old way: get from node params

	const body = new URLSearchParams();
	body.append('project_id', projectIdToConfirm);

	return await this.helpers.httpRequest({
		method: 'POST',
		url: `${baseUrl}/project/confirm`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/x-www-form-urlencoded', // Align with user's cURL
		},
		body: body.toString(), // Send as URL-encoded string
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

// File operations
async function fileGet(
	this: IExecuteFunctions,
	i: number,
	baseUrl: string,
	_items: INodeExecutionData[],
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
					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${BASE_URL}/workflow`,
						headers: {
							Authorization: `Bearer ${apiKey}`,
						},
					}) as { workflows: Array<{ id: string; name: string }> }; // Added type assertion
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
					this.logger.warn('Workflows data (inside response.workflows) was not an array.', { response });
					return [];
				} catch (error) {
					this.logger.error('Error loading workflows:', { error: error.message, stack: error.stack });
					return [];
				}
			},
			async getLanguages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				this.logger.debug('Attempting to load languages...');
				const credentials = await this.getCredentials('strakerVerifyApi');
				const apiKey = (credentials.apiKey as string) || '';
				this.logger.debug(`API Key for languages: ${apiKey ? 'Loaded' : 'MISSING'}`);

				try {
					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${BASE_URL}/languages`,
						headers: {
							Authorization: `Bearer ${apiKey}`,
						},
					}) as { data: Array<{ id: string; name: string; code?: string }> }; // Added type assertion
					this.logger.debug('Raw languages API response:', { data: response });

					const languagesArray = response.data; // Access the nested array

					if (Array.isArray(languagesArray)) {
						const mappedLanguages = languagesArray
							.map((language) => ({
								name: language.name, // Assuming 'name' is the correct property for display
								value: language.id,
							}))
							.sort((a, b) => a.name.localeCompare(b.name));
						this.logger.debug('Mapped languages:', { data: mappedLanguages });
						return mappedLanguages;
					}
					this.logger.warn('Languages data (inside response.data) was not an array.', { response });
					return [];
				} catch (error) {
					this.logger.error('Error loading languages:', { error: error.message, stack: error.stack });
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

		this.logger.debug('===== DEBUG: Node Execution Start =====');
		this.logger.debug(`Resource: ${resource}, Operation: ${operation}, Input Items: ${items.length}`);

		if (resource === 'project' && operation === 'create') {
			this.logger.debug('Executing projectCreate once for all items.');
			try {
				// Call projectCreate once. It uses itemIndex 0 for shared NodeParameters
				// and this.getInputData() internally to gather all files.
				const projectCreateResult = await projectCreate.call(this, 0, BASE_URL, credentials);
				// projectCreateResult is INodeExecutionData[] (usually one item: {json: apiResponse})
				returnData = projectCreateResult;
				this.logger.debug('projectCreate successful', { responseDataCount: returnData.length });
			} catch (error) {
				this.logger.error('Error during single projectCreate call:', { message: error.message, stack: error.stack });
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
									responseData = await projectGetAll.call(this, i, BASE_URL, credentials);
									break;
								case 'get':
									responseData = await projectGet.call(this, i, BASE_URL, credentials);
									break;
								case 'confirm':
									// For the general 'confirm' operation (not the one inside projectCreate)
									// it should still get projectId from parameters.
									const projectIdToConfirm = this.getNodeParameter('projectId', i) as string;
									responseData = await projectConfirm.call(this, i, BASE_URL, credentials, projectIdToConfirm);
									break;
								case 'getSegments':
									responseData = await projectGetSegments.call(this, i, BASE_URL, credentials);
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
									responseData = await keyGet.call(this, i, BASE_URL, credentials);
									break;
								case 'create':
									responseData = await keyCreate.call(this, i, BASE_URL, credentials);
									break;
								case 'delete':
									responseData = await keyDelete.call(this, i, BASE_URL, credentials);
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
									responseData = await userGetMe.call(this, i, BASE_URL, credentials);
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
									singleItemExecutionData = await fileGet.call(this, i, BASE_URL, items, credentials);
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
						if (Array.isArray(responseData) && responseData.length > 0 && typeof responseData[0] === 'object' && responseData[0] !== null && 'json' in responseData[0]) {
							// If it's already in the expected format (array of INodeExecutionData-like objects)
							returnData.push(...responseData.map(data => ({ ...data, pairedItem: { item: i } })));
						} else {
							// Otherwise, wrap it as standard { json: responseData }
							returnData.push({ json: responseData, pairedItem: { item: i } });
						}
					} else {
						this.logger.warn(`No response data or execution data produced for item ${i}, resource "${resource}", operation "${operation}"`);
					}

				} catch (error) {
					this.logger.error(`Error processing item ${i} for ${resource}/${operation}:`, { message: error.message, stack: error.stack });
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
