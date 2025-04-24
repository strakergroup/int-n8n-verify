![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-straker-verify

This is an n8n community node. It lets you use the Straker Verify API in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Quick Installation

1. Open your n8n instance
2. Go to **Settings > Community Nodes**
3. Select **Install**
4. Enter `n8n-nodes-straker-verify` in **Enter npm package name**
5. Agree to the risks of using community nodes: select **I understand the risks of installing unverified code from a third party**
6. Select **Install**

## Operations

### Language Resource

* **Get Many**: Retrieve all supported languages

### File Resource

* **Get**: Download a file by ID returning binary data

### Key Resource

* **Create**: Create a new API key
* **Get**: Get a specific API key
* **Get Many**: Get all API keys

### Project Resource

* **Confirm**: Confirm a project
* **Create**: Create a new project
* **Get**: Get a specific project
* **Get Many**: Get all projects
* **Get Segments**: Retrieve segments of a specific project

### User Resource

* **Get Balance**: Get the user token balance

### Workflow Resource

* **Get**: Get a specific workflow
* **Get Many**: Get all available workflows

## Credentials

To use this node, you'll need to create an API key from the Straker Verify platform.

1. Log in to your Straker Verify account
2. Navigate to API Keys section
3. Create a new API key
4. Use the generated key in your n8n credentials for this node

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Straker Verify API Documentation](https://strakerverify.docs.apiary.io)

## Binary Data Handling

This node supports proper binary data handling for files:

* When using the **File > Get** operation, the node returns data in binary format that can be used directly with other n8n nodes like Google Drive, AWS S3, etc.
* When using the binary data with other nodes, refer to the binary property name `data` in the receiving node's configuration.
* Project creation also accepts binary files as input through the binary property specified in the Files field.
