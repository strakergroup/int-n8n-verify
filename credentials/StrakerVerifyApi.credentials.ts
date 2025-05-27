import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class StrakerVerifyApi implements ICredentialType {
	name = 'strakerVerifyApi';
	displayName = 'Straker Verify API';
	documentationUrl = 'https://strakerverify.docs.apiary.io';
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
			baseURL: 'https://api-verify.straker.ai',
			url: '/languages',
			method: 'GET',
		},
	};
}
