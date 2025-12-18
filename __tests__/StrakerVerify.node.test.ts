import { StrakerVerify } from '../nodes/StrakerVerify/StrakerVerify.node';
import { NodeOperationError, NodeApiError } from 'n8n-workflow';
import {
	createMockExecuteFunctions,
	createMockLoadOptionsFunctions,
	createMockBinaryData,
	createMockExecutionData,
} from './helpers/mockHelpers';
import { STRAKER_VERIFY_BASE_URL } from '../credentials/StrakerVerifyApi.credentials';
import { Language, Workflow } from '../nodes/StrakerVerify/type';

describe('StrakerVerify Node', () => {
	let node: StrakerVerify;

	beforeEach(() => {
		node = new StrakerVerify();
		jest.clearAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct node description properties', () => {
			expect(node.description.displayName).toBe('Straker Verify');
			expect(node.description.name).toBe('strakerVerify');
			expect(node.description.group).toEqual(['transform']);
			expect(node.description.version).toBe(1);
			expect(node.description.inputs).toEqual(['main']);
			expect(node.description.outputs).toEqual(['main']);
			expect(node.description.usableAsTool).toBe(true);
		});

		it('should require strakerVerifyApi credentials', () => {
			const credentials = node.description.credentials;
			expect(credentials).toBeDefined();
			expect(credentials?.[0]?.name).toBe('strakerVerifyApi');
			expect(credentials?.[0]?.required).toBe(true);
		});
	});

	describe('LoadOptions - getLanguages', () => {
		it('should fetch and format languages correctly', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			const mockLanguages: Language[] = [
				{ uuid: 'lang-1', code: 'en', site_shortcode: 'US', name: 'English' },
				{ uuid: 'lang-2', code: 'es', site_shortcode: 'ES', name: 'Spanish' },
			];

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockLanguages);

			const result = await node.methods.loadOptions.getLanguages.call(mockFunctions as any);

			expect(mockFunctions.getCredentials).toHaveBeenCalledWith('strakerVerifyApi');
			expect(mockFunctions.helpers.httpRequestWithAuthentication.call).toHaveBeenCalledWith(
				mockFunctions,
				'strakerVerifyApi',
				{
					method: 'GET',
					url: `${STRAKER_VERIFY_BASE_URL}/project/languages?environment=production`,
				},
			);

			expect(result).toEqual([
				{ name: 'English', value: 'lang-1' },
				{ name: 'Spanish', value: 'lang-2' },
			]);
		});

		it('should use default environment when not specified', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			const mockLanguages: Language[] = [
				{ uuid: 'lang-1', code: 'en', site_shortcode: 'US', name: 'English' },
			];

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockLanguages);

			await node.methods.loadOptions.getLanguages.call(mockFunctions as any);

			expect(mockFunctions.helpers.httpRequestWithAuthentication.call).toHaveBeenCalledWith(
				mockFunctions,
				'strakerVerifyApi',
				{
					method: 'GET',
					url: `${STRAKER_VERIFY_BASE_URL}/project/languages?environment=production`,
				},
			);
		});

		it('should use sandbox environment when specified', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			const mockLanguages: Language[] = [
				{ uuid: 'lang-1', code: 'en', site_shortcode: 'US', name: 'English' },
			];

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'sandbox',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockLanguages);

			await node.methods.loadOptions.getLanguages.call(mockFunctions as any);

			expect(mockFunctions.helpers.httpRequestWithAuthentication.call).toHaveBeenCalledWith(
				mockFunctions,
				'strakerVerifyApi',
				{
					method: 'GET',
					url: `${STRAKER_VERIFY_BASE_URL}/project/languages?environment=sandbox`,
				},
			);
		});

		it('should propagate API errors', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			const apiError = new Error('API Error');

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockRejectedValue(apiError);

			await expect(
				node.methods.loadOptions.getLanguages.call(mockFunctions as any),
			).rejects.toThrow();
		});
	});

	describe('LoadOptions - getWorkflows', () => {
		it('should fetch and format workflows correctly', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			const mockWorkflows: Workflow[] = [
				{ uuid: 'workflow-1', name: 'Translation Workflow', description: 'Test', active: 'true' },
				{ uuid: 'workflow-2', name: 'Review Workflow', description: 'Test', active: 'true' },
			];

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockWorkflows);

			const result = await node.methods.loadOptions.getWorkflows.call(mockFunctions as any);

			expect(mockFunctions.getCredentials).toHaveBeenCalledWith('strakerVerifyApi');
			expect(mockFunctions.helpers.httpRequestWithAuthentication.call).toHaveBeenCalledWith(
				mockFunctions,
				'strakerVerifyApi',
				{
					method: 'GET',
					url: `${STRAKER_VERIFY_BASE_URL}/project/workflows?environment=production`,
				},
			);

			expect(result).toEqual([
				{ name: 'Translation Workflow', value: 'workflow-1' },
				{ name: 'Review Workflow', value: 'workflow-2' },
			]);
		});

		it('should handle empty workflow response', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue([]);

			const result = await node.methods.loadOptions.getWorkflows.call(mockFunctions as any);

			expect(result).toEqual([]);
		});

		it('should handle null workflow response', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(null);

			const result = await node.methods.loadOptions.getWorkflows.call(mockFunctions as any);

			expect(result).toEqual([]);
		});

		it('should propagate API errors', async () => {
			const mockFunctions = createMockLoadOptionsFunctions();
			const apiError = new Error('API Error');

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockRejectedValue(apiError);

			await expect(
				node.methods.loadOptions.getWorkflows.call(mockFunctions as any),
			).rejects.toThrow();
		});
	});

	describe('Execute - Create Project', () => {
		it('should create a project successfully', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockResponse = {
				project_id: 'project-123',
				message: 'Project created successfully',
			};
			const mockWorkflows: Workflow[] = [
				{ uuid: 'workflow-1', name: 'Translation Workflow', description: 'Test', active: 'true' },
			];
			const binaryData = createMockBinaryData('test.pdf', 'application/pdf');
			const mockBuffer = Buffer.from('test file content');

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({}, binaryData),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('Test Project') // title
				.mockReturnValueOnce(['lang-1', 'lang-2']) // languages
				.mockReturnValueOnce('workflow-1') // workflow
				.mockReturnValueOnce('https://example.com/callback') // callbackUri
				.mockReturnValueOnce('Client notes') // clientNotes
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(mockBuffer);
			// Mock workflow fetch call (for validation) and project creation call
			mockFunctions.helpers.httpRequestWithAuthentication.call
				.mockResolvedValueOnce(mockWorkflows) // First call: fetch workflows for validation
				.mockResolvedValueOnce(mockResponse); // Second call: create project

			const result = await node.execute.call(mockFunctions as any);

			expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('resource', 0);
			expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('operation', 0);
			expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('title', 0);
			expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('languages', 0);
			expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('workflow', 0);
			expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('callbackUri', 0);
			expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('clientNotes', 0, '');
			expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('binaryProperty', 0, 'data');

			// Verify workflow fetch call for validation
			expect(mockFunctions.helpers.httpRequestWithAuthentication.call).toHaveBeenNthCalledWith(
				1,
				mockFunctions,
				'strakerVerifyApi',
				{
					method: 'GET',
					url: `${STRAKER_VERIFY_BASE_URL}/project/workflows?environment=production`,
				},
			);

			expect(mockFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
			expect(mockFunctions.helpers.httpRequestWithAuthentication.call).toHaveBeenNthCalledWith(
				2,
				mockFunctions,
				'strakerVerifyApi',
				expect.objectContaining({
					method: 'POST',
					url: `${STRAKER_VERIFY_BASE_URL}/project?app_source=n8n&environment=production`,
					body: expect.any(FormData),
				}),
			);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual(mockResponse);
		});

		it('should throw error when workflow ID is invalid', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockWorkflows: Workflow[] = [
				{ uuid: 'workflow-1', name: 'Translation Workflow', description: 'Test', active: 'true' },
				{ uuid: 'workflow-2', name: 'Review Workflow', description: 'Test', active: 'true' },
			];
			const binaryData = createMockBinaryData('test.pdf', 'application/pdf');

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({}, binaryData),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('Test Project') // title
				.mockReturnValueOnce(['lang-1']) // languages
				.mockReturnValueOnce('invalid-workflow-id') // workflow - invalid!
				.mockReturnValueOnce('https://example.com/callback') // callbackUri
				.mockReturnValueOnce('') // clientNotes
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockWorkflows);

			try {
				await node.execute.call(mockFunctions as any);
				fail('Expected error to be thrown');
			} catch (error: any) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect(error.message).toContain('Invalid workflow ID "invalid-workflow-id"');
				expect(error.message).toContain('Please select a valid workflow from the dropdown');
			}
		});

		it('should include error message asking to select valid workflow', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockWorkflows: Workflow[] = [
				{ uuid: 'workflow-1', name: 'Translation Workflow', description: 'Test', active: 'true' },
				{ uuid: 'workflow-2', name: 'Review Workflow', description: 'Test', active: 'true' },
			];
			const binaryData = createMockBinaryData('test.pdf', 'application/pdf');

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({}, binaryData),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('Test Project') // title
				.mockReturnValueOnce(['lang-1']) // languages
				.mockReturnValueOnce('invalid-workflow-id') // workflow - invalid!
				.mockReturnValueOnce('https://example.com/callback') // callbackUri
				.mockReturnValueOnce('') // clientNotes
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockWorkflows);

			try {
				await node.execute.call(mockFunctions as any);
				fail('Expected error to be thrown');
			} catch (error: any) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect(error.message).toContain('Invalid workflow ID "invalid-workflow-id"');
				expect(error.message).toContain('Please select a valid workflow from the dropdown');
			}
		});

		it('should handle empty workflow list in error message', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const binaryData = createMockBinaryData('test.pdf', 'application/pdf');

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({}, binaryData),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('Test Project') // title
				.mockReturnValueOnce(['lang-1']) // languages
				.mockReturnValueOnce('workflow-1') // workflow
				.mockReturnValueOnce('https://example.com/callback') // callbackUri
				.mockReturnValueOnce('') // clientNotes
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue([]);

			try {
				await node.execute.call(mockFunctions as any);
				fail('Expected error to be thrown');
			} catch (error: any) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect(error.message).toContain('Invalid workflow ID "workflow-1"');
				expect(error.message).toContain('Please select a valid workflow from the dropdown');
			}
		});

		it('should return empty result when no input items received', async () => {
			const mockFunctions = createMockExecuteFunctions();

			mockFunctions.getInputData.mockReturnValue([]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('create'); // operation

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			// When items array is empty, the loop never executes, so we get an empty result
			const result = await node.execute.call(mockFunctions as any);
			expect(result[0]).toEqual([]);
		});

		it('should throw error when binary data is missing', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockWorkflows: Workflow[] = [
				{ uuid: 'workflow-1', name: 'Translation Workflow', description: 'Test', active: 'true' },
			];

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({}, undefined),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('Test Project') // title
				.mockReturnValueOnce(['lang-1']) // languages
				.mockReturnValueOnce('workflow-1') // workflow
				.mockReturnValueOnce('https://example.com/callback') // callbackUri
				.mockReturnValueOnce('') // clientNotes
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockWorkflows);

			await expect(node.execute.call(mockFunctions as any)).rejects.toThrow(NodeOperationError);
		});

		it('should handle multiple files', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockResponse = {
				project_id: 'project-123',
				message: 'Project created successfully',
			};
			const mockWorkflows: Workflow[] = [
				{ uuid: 'workflow-1', name: 'Translation Workflow', description: 'Test', active: 'true' },
			];
			const binaryData1 = createMockBinaryData('test1.pdf', 'application/pdf');
			const binaryData2 = createMockBinaryData('test2.pdf', 'application/pdf');
			const mockBuffer = Buffer.from('test file content');

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({}, binaryData1),
				createMockExecutionData({}, binaryData2),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('Test Project') // title
				.mockReturnValueOnce(['lang-1']) // languages
				.mockReturnValueOnce('workflow-1') // workflow
				.mockReturnValueOnce('https://example.com/callback') // callbackUri
				.mockReturnValueOnce('') // clientNotes
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(mockBuffer);
			mockFunctions.helpers.httpRequestWithAuthentication.call
				.mockResolvedValueOnce(mockWorkflows) // First call: fetch workflows for validation
				.mockResolvedValueOnce(mockResponse); // Second call: create project

			const result = await node.execute.call(mockFunctions as any);

			expect(mockFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(1);
		});

		it('should handle HTTP request errors', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockWorkflows: Workflow[] = [
				{ uuid: 'workflow-1', name: 'Translation Workflow', description: 'Test', active: 'true' },
			];
			const binaryData = createMockBinaryData('test.pdf', 'application/pdf');
			const mockBuffer = Buffer.from('test file content');

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({}, binaryData),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('Test Project') // title
				.mockReturnValueOnce(['lang-1']) // languages
				.mockReturnValueOnce('workflow-1') // workflow
				.mockReturnValueOnce('https://example.com/callback') // callbackUri
				.mockReturnValueOnce('') // clientNotes
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(mockBuffer);
			mockFunctions.helpers.httpRequestWithAuthentication.call
				.mockResolvedValueOnce(mockWorkflows) // First call: fetch workflows for validation
				.mockRejectedValueOnce(new Error('API Error')); // Second call: create project fails

			await expect(node.execute.call(mockFunctions as any)).rejects.toThrow(NodeApiError);
		});

		it('should throw NodeApiError on API failure during create', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockWorkflows: Workflow[] = [
				{ uuid: 'workflow-1', name: 'Translation Workflow', description: 'Test', active: 'true' },
			];
			const binaryData = createMockBinaryData('test.pdf', 'application/pdf');
			const mockBuffer = Buffer.from('test file content');
			const apiError = new Error('Forbidden');

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({}, binaryData),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('Test Project') // title
				.mockReturnValueOnce(['lang-1']) // languages
				.mockReturnValueOnce('workflow-1') // workflow
				.mockReturnValueOnce('https://example.com/callback') // callbackUri
				.mockReturnValueOnce('') // clientNotes
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(mockBuffer);
			mockFunctions.helpers.httpRequestWithAuthentication.call
				.mockResolvedValueOnce(mockWorkflows) // First call: fetch workflows for validation
				.mockRejectedValueOnce(apiError); // Second call: create project fails

			await expect(node.execute.call(mockFunctions as any)).rejects.toThrow(NodeApiError);
		});

		it('should only process first item for create operation', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockResponse = {
				project_id: 'project-123',
				message: 'Project created successfully',
			};
			const mockWorkflows: Workflow[] = [
				{ uuid: 'workflow-1', name: 'Translation Workflow', description: 'Test', active: 'true' },
			];
			const binaryData = createMockBinaryData('test.pdf', 'application/pdf');
			const mockBuffer = Buffer.from('test file content');

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({}, binaryData),
				createMockExecutionData({}, binaryData),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('create') // operation
				.mockReturnValueOnce('Test Project') // title
				.mockReturnValueOnce(['lang-1']) // languages
				.mockReturnValueOnce('workflow-1') // workflow
				.mockReturnValueOnce('https://example.com/callback') // callbackUri
				.mockReturnValueOnce('') // clientNotes
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(mockBuffer);
			mockFunctions.helpers.httpRequestWithAuthentication.call
				.mockResolvedValueOnce(mockWorkflows) // First call: fetch workflows for validation
				.mockResolvedValueOnce(mockResponse); // Second call: create project

			const result = await node.execute.call(mockFunctions as any);

			// Should make two HTTP requests: one for workflow validation, one for project creation
			expect(mockFunctions.helpers.httpRequestWithAuthentication.call).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(1);
		});
	});

	describe('Execute - Download Files', () => {
		it('should download files successfully', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockResponse = {
				data: [
					{
						content_base64: Buffer.from('file content').toString('base64'),
						filename: 'translated-file.pdf',
						status: 'completed',
					},
				],
			};
			const mockBinaryData = {
				data: Buffer.from('file content'),
				fileName: 'translated-file.pdf',
				mimeType: 'application/pdf',
				fileSize: 12,
			};

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({ projectId: 'project-123' }),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('downloadFiles') // operation
				.mockReturnValueOnce('project-123') // projectId
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockResponse);
			mockFunctions.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

			const result = await node.execute.call(mockFunctions as any);

			expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('projectId', 0);
			expect(mockFunctions.getNodeParameter).toHaveBeenCalledWith('binaryProperty', 0);
			expect(mockFunctions.helpers.httpRequestWithAuthentication.call).toHaveBeenCalledWith(
				mockFunctions,
				'strakerVerifyApi',
				{
					method: 'GET',
					url: `${STRAKER_VERIFY_BASE_URL}/project/project-123/files?environment=production`,
				},
			);

			expect(mockFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
				expect.any(Buffer),
				'translated-file.pdf',
			);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary?.data).toEqual(mockBinaryData);
			expect(result[0][0].json).toEqual({ status: 'completed' });
		});

		it('should handle response without data wrapper', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockResponse = [
				{
					content_base64: Buffer.from('file content').toString('base64'),
					filename: 'translated-file.pdf',
					status: 'completed',
				},
			];
			const mockBinaryData = {
				data: Buffer.from('file content'),
				fileName: 'translated-file.pdf',
				mimeType: 'application/pdf',
				fileSize: 12,
			};

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({ projectId: 'project-123' }),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('downloadFiles') // operation
				.mockReturnValueOnce('project-123') // projectId
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockResponse);
			mockFunctions.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

			const result = await node.execute.call(mockFunctions as any);

			expect(result[0]).toHaveLength(1);
		});

		it('should throw error when no files returned', async () => {
			const mockFunctions = createMockExecuteFunctions();

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({ projectId: 'project-123' }),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('downloadFiles') // operation
				.mockReturnValueOnce('project-123') // projectId
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue({ data: [] });

			await expect(node.execute.call(mockFunctions as any)).rejects.toThrow(NodeOperationError);
		});

		it('should throw error when content_base64 is missing', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockResponse = {
				data: [
					{
						filename: 'translated-file.pdf',
						status: 'completed',
					},
				],
			};

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({ projectId: 'project-123' }),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('downloadFiles') // operation
				.mockReturnValueOnce('project-123') // projectId
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockResponse);

			await expect(node.execute.call(mockFunctions as any)).rejects.toThrow(NodeOperationError);
		});

		it('should handle multiple files in response', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockResponse = {
				data: [
					{
						content_base64: Buffer.from('file1 content').toString('base64'),
						filename: 'file1.pdf',
						status: 'completed',
					},
					{
						content_base64: Buffer.from('file2 content').toString('base64'),
						filename: 'file2.pdf',
						status: 'completed',
					},
				],
			};
			const mockBinaryData = {
				data: Buffer.from('file content'),
				fileName: 'test.pdf',
				mimeType: 'application/pdf',
				fileSize: 12,
			};

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({ projectId: 'project-123' }),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('downloadFiles') // operation
				.mockReturnValueOnce('project-123') // projectId
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockResponse);
			mockFunctions.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

			const result = await node.execute.call(mockFunctions as any);

			expect(result[0]).toHaveLength(2);
			expect(mockFunctions.helpers.prepareBinaryData).toHaveBeenCalledTimes(2);
		});

		it('should use default filename when not provided', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const mockResponse = {
				data: [
					{
						content_base64: Buffer.from('file content').toString('base64'),
						status: 'completed',
					},
				],
			};
			const mockBinaryData = {
				data: Buffer.from('file content'),
				fileName: 'file',
				mimeType: 'application/pdf',
				fileSize: 12,
			};

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({ projectId: 'project-123' }),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('downloadFiles') // operation
				.mockReturnValueOnce('project-123') // projectId
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockResolvedValue(mockResponse);
			mockFunctions.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

			await node.execute.call(mockFunctions as any);

			expect(mockFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
				expect.any(Buffer),
				'file',
			);
		});

		it('should throw NodeApiError on API failure during downloadFiles', async () => {
			const mockFunctions = createMockExecuteFunctions();
			const apiError = new Error('Forbidden');

			mockFunctions.getInputData.mockReturnValue([
				createMockExecutionData({ projectId: 'project-123' }),
			]);

			mockFunctions.getNodeParameter
				.mockReturnValueOnce('project') // resource
				.mockReturnValueOnce('downloadFiles') // operation
				.mockReturnValueOnce('project-123') // projectId
				.mockReturnValueOnce('data'); // binaryProperty

			mockFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				environment: 'production',
			});

			mockFunctions.helpers.httpRequestWithAuthentication.call.mockRejectedValue(apiError);

			await expect(node.execute.call(mockFunctions as any)).rejects.toThrow(NodeApiError);
		});
	});
});

