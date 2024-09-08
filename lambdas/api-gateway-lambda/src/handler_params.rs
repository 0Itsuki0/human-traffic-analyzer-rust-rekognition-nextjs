use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct GetJobsQueryParams {
    pub job_id: String,
    pub request_timestamp: u64
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct UploadPresignURLQueryParams {
    pub content_type: String,
    pub filename: String
}

// start_analysis
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub struct StartAnalysisBodyParams {
    pub user_id: String,
    pub s3_folder_name: String,
    pub filename: String
}

// #[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
// #[serde(rename_all = "snake_case")]
// pub enum PresignType {
//     Put,
//     Get,
// }

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct PutTitleParams {
    pub title: String,
}
