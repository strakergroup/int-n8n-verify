import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IBinaryData,
	NodeOperationError,
	ILoadOptionsFunctions,
	ApplicationError,
} from 'n8n-workflow';
import { projectOperations, projectFields } from './StrakerVerifyDescription';
import { Language, Workflow } from './type';
import { STRAKER_VERIFY_BASE_URL } from '../../credentials/StrakerVerifyApi.credentials';

async function fetchWorkflows(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	environment: string,
): Promise<Workflow[]> {
	try {
		const response = (await context.helpers.httpRequestWithAuthentication.call(
			context,
			'strakerVerifyApi',
			{
				method: 'GET',
				url: `${STRAKER_VERIFY_BASE_URL}/project/workflows?environment=${environment}`,
			},
		)) as Workflow[];

		return response || [];
	} catch (error: any) {
		// Preserve original error message, especially for subscription errors (403)
		let errorMessage = 'Failed to fetch workflows.';
		if (error.response?.statusCode === 403 && error.response?.body?.detail) {
			errorMessage = error.response.body.detail;
		} else if (error.response?.body?.detail) {
			errorMessage = error.response.body.detail;
		} else if (error.message) {
			errorMessage = error.message;
		}
		throw new NodeOperationError(context.getNode(), errorMessage);
	}
}

export class StrakerVerify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Straker Verify',
		name: 'strakerVerify',
		icon: 'file:strakerverify.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with Straker Verify API',
		defaults: {
			name: 'Straker Verify',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'strakerVerifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Project',
						value: 'project',
					},
				],
				default: 'project',
			},

			...projectOperations,

			...projectFields,
		],
	};

	methods = {
		loadOptions: {
			async getLanguages(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials('strakerVerifyApi');
				const environment = credentials.environment || 'production';

				try {
					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'strakerVerifyApi',
						{
							method: 'GET',
							url: `${STRAKER_VERIFY_BASE_URL}/project/languages?environment=${environment}`,
						},
					)) as Language[];

					return response.map((lang) => ({
						name: lang.name,
						value: lang.uuid,
					}));
				} catch (error: any) {
					// Preserve original error message, especially for subscription errors (403)
					// For loadOptions, use ApplicationError which serializes properly
					let errorMessage = 'Failed to fetch languages.';
					if (error.response?.statusCode === 403 && error.response?.body?.detail) {
						errorMessage = error.response.body.detail;
					} else if (error.response?.body?.detail) {
						errorMessage = error.response.body.detail;
					} else if (error.message) {
						errorMessage = error.message;
					}
					throw new ApplicationError(errorMessage);
				}
			},

			async getWorkflows(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials('strakerVerifyApi');
				const environment = (credentials.environment as string) || 'production';

				try {
					const workflows = await fetchWorkflows(this, environment);
					return workflows.map((workflow: Workflow) => ({
						name: workflow.name,
						value: workflow.uuid,
					}));
				} catch (error: any) {
					// For loadOptions, use ApplicationError which serializes properly
					// Extract error message, prioritizing 403 subscription errors
					let errorMessage = 'Failed to fetch workflows.';
					if (error instanceof NodeOperationError) {
						errorMessage = error.message;
					} else if (error.response?.statusCode === 403 && error.response?.body?.detail) {
						errorMessage = error.response.body.detail;
					} else if (error.response?.body?.detail) {
						errorMessage = error.response.body.detail;
					} else if (error.message) {
						errorMessage = error.message;
					}
					throw new ApplicationError(errorMessage);
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('strakerVerifyApi');
		const environment = (credentials.environment as string) || 'production';

		const returnItems: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			if (resource === 'project') {
				if (operation === 'create') {
					if (i > 0) continue;

					const title = this.getNodeParameter('title', i) as string;
					const languages = this.getNodeParameter('languages', i) as string[];
					const workflow = this.getNodeParameter('workflow', i) as string;
					const callbackUri = this.getNodeParameter('callbackUri', i) as string;
					const clientNotes = this.getNodeParameter('clientNotes', i, '') as string;
					const binaryProperty = this.getNodeParameter('binaryProperty', i, 'data') as string;

					// Validate workflow ID
					const availableWorkflows = await fetchWorkflows(this, environment);
					const workflowIds = availableWorkflows.map((w: Workflow) => w.uuid);
					if (!workflowIds.includes(workflow)) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid workflow ID "${workflow}". Please select a valid workflow from the dropdown.`,
							{ itemIndex: i },
						);
					}

					if (!items.length) {
						throw new NodeOperationError(
							this.getNode(),
							'No input items received to upload files.',
						);
					}

					const formData = new FormData();
					formData.append('title', title);
					formData.append('workflow_id', workflow);
					formData.append('callback_uri', callbackUri);
					formData.append('client_notes', clientNotes ?? '');

					for (const language of languages) {
						formData.append('languages', language);
					}

					for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
						const binaryData = items[itemIndex].binary?.[binaryProperty] as IBinaryData | undefined;
						if (!binaryData) {
							throw new NodeOperationError(
								this.getNode(),
								`Binary data property "${binaryProperty}" missing on item ${itemIndex}.`,
								{ itemIndex },
							);
						}

						const fileBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryProperty);
						const fileName = binaryData.fileName || `file${itemIndex}`;
						const mimeType = binaryData.mimeType || 'application/octet-stream';

						formData.append('files', new Blob([fileBuffer], { type: mimeType }), fileName);
					}

					const url = `${STRAKER_VERIFY_BASE_URL}/project?app_source=n8n&environment=${environment}`;

					try {
						const responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'strakerVerifyApi',
							{
								method: 'POST',
								url,
								body: formData,
							},
						);

						returnItems.push({ json: responseData });
					} catch (error: any) {
						// Preserve original error message, especially for subscription errors (403)
						let errorMessage = 'Failed to create project.';
						if (error.response?.statusCode === 403 && error.response?.body?.detail) {
							errorMessage = error.response.body.detail;
						} else if (error.response?.body?.detail) {
							errorMessage = error.response.body.detail;
						} else if (error.message) {
							errorMessage = error.message;
						}
						throw new NodeOperationError(this.getNode(), errorMessage);
					}

					break;
				} else if (operation === 'downloadFiles') {
					const projectId = this.getNodeParameter('projectId', i) as string;
					const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;

					const url = `${STRAKER_VERIFY_BASE_URL}/project/${projectId}/files?environment=${environment}`;

					let responseData;
					try {
						responseData = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'strakerVerifyApi',
							{
								method: 'GET',
								url,
							},
						);
					} catch (error: any) {
						// Preserve original error message, especially for subscription errors (403)
						let errorMessage = 'Failed to download project files.';
						if (error.response?.statusCode === 403 && error.response?.body?.detail) {
							errorMessage = error.response.body.detail;
						} else if (error.response?.body?.detail) {
							errorMessage = error.response.body.detail;
						} else if (error.message) {
							errorMessage = error.message;
						}
						throw new NodeOperationError(this.getNode(), errorMessage, { itemIndex: i });
					}

					const files = responseData?.data ?? responseData;

					if (!Array.isArray(files) || files.length === 0) {
						throw new NodeOperationError(
							this.getNode(),
							'No files returned for the specified project.',
							{ itemIndex: i },
						);
					}

					for (const file of files as Array<Record<string, any>>) {
						const { content_base64: contentBase64, filename, ...rest } = file;

						if (typeof contentBase64 !== 'string') {
							throw new NodeOperationError(
								this.getNode(),
								'File payload is missing "content_base64".',
								{ itemIndex: i },
							);
						}

						const binaryData = await this.helpers.prepareBinaryData(
							Buffer.from(contentBase64, 'base64'),
							filename || 'file',
						);

						returnItems.push({
							json: rest,
							binary: {
								[binaryProperty]: binaryData,
							},
						});
					}
				}
			}
		}

		return [returnItems];
	}
}
