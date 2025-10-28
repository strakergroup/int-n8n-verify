export interface Workflow {
	uuid: string;
	name: string;
	description: string;
	active: string;
	version?: string;
	created_at?: string;
}

export interface Language {
	uuid: string;
	code: string;
	site_shortcode: string;
	name: string;
}

export interface ProjectDetailsData {
	uuid: string;
	client_uuid?: string;
	title?: string;
	status: string;
	target_languages?: Array<any>;
	source_files?: Array<any>;
	archived?: boolean;
	callback_uri?: string;
	created_at?: string;
	modified_at?: string;
}

export interface ProjectGetResponse {
	data: ProjectDetailsData;
	token_cost?: number; // Mark as optional, as it might not be present if status is IN_PROGRESS
}

export interface ProjectCreateApiResponse {
	project_id: string;
	message: string;
}
