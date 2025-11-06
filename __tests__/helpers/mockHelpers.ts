import type {
	INodeExecutionData,
	IBinaryData,
} from 'n8n-workflow';

export interface MockExecuteFunctions {
	getInputData: jest.Mock;
	getNodeParameter: jest.Mock;
	getCredentials: jest.Mock;
	getNode: jest.Mock;
	helpers: {
		httpRequestWithAuthentication: {
			call: jest.Mock;
		};
		getBinaryDataBuffer: jest.Mock;
		prepareBinaryData: jest.Mock;
	};
	[key: string]: any;
}

export interface MockLoadOptionsFunctions {
	getCredentials: jest.Mock;
	helpers: {
		httpRequestWithAuthentication: {
			call: jest.Mock;
		};
	};
	[key: string]: any;
}

export const createMockExecuteFunctions = (): MockExecuteFunctions => {
	const mockHelpers = {
		httpRequestWithAuthentication: {
			call: jest.fn(),
		},
		getBinaryDataBuffer: jest.fn(),
		prepareBinaryData: jest.fn(),
	};

	return {
		getInputData: jest.fn<INodeExecutionData[], []>(() => []),
		getNodeParameter: jest.fn(),
		getCredentials: jest.fn(),
		getNode: jest.fn(() => ({
			id: 'test-node-id',
			name: 'Straker Verify',
			type: 'strakerVerify',
			typeVersion: 1,
			position: [0, 0],
		})),
		helpers: mockHelpers as any,
	};
};

export const createMockLoadOptionsFunctions = (): MockLoadOptionsFunctions => {
	const mockHelpers = {
		httpRequestWithAuthentication: {
			call: jest.fn(),
		},
	};

	return {
		getCredentials: jest.fn(),
		helpers: mockHelpers as any,
	};
};

export const createMockBinaryData = (fileName: string, mimeType: string): IBinaryData => {
	return {
		data: 'base64encodeddata',
		fileName,
		mimeType,
		fileSize: '1024',
	};
};

export const createMockExecutionData = (
	data: Record<string, any> = {},
	binaryData?: IBinaryData,
): INodeExecutionData => {
	return {
		json: data,
		binary: binaryData ? { data: binaryData } : undefined,
	};
};

