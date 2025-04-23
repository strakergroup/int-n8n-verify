module.exports = {
	packageName: 'n8n-nodes-straker-verify',
	nodeTypes: {
		StrakerVerify: 'dist/nodes/StrakerVerify/StrakerVerify.node.js',
	},
	credentialTypes: {
		StrakerVerifyApi: 'dist/credentials/StrakerVerifyApi.credentials.js',
	},
};
