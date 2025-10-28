import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export const STRAKER_VERIFY_BASE_URL =
  process.env.STRAKER_VERIFY_BASE_URL || 'https://automation-gateway.straker.ai';

export class StrakerVerifyApi implements ICredentialType {
	name = 'strakerVerifyApi';
	displayName = 'Straker Verify API';
	documentationUrl = 'https://automation-gateway.straker.ai/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			required: true,
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Production',
					value: 'production',
				},
				{
					name: 'Sandbox',
					value: 'sandbox',
				},
			],
			default: 'production',
			description: 'Select whether to use the production or sandbox environment',
		},
	];

	// This allows the credential to be used by other parts of n8n
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// The block below tells how this credential can be tested
	test: ICredentialTestRequest = {
		request: {
			baseURL: STRAKER_VERIFY_BASE_URL,
			url: '/project/languages',
			method: 'GET',
		},
	};
}
