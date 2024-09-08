use axum::extract::{Query, State};
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::{
    extract::Path,
    response::Json,
};
use lib::common_structs::{JobStatus, LastEvaluatedKey};
use lib::constants::{PRESIGNED_VALID_DURATION_UPLOAD, PRESIGNED_VALID_DURATION_VIEW, RESULTS_JSON_KEY};
use lib::env_keys::{ROLE_ARN_KEY, S3_BUCKET_NAME_KEY, TABLE_NAME_KEY, TOPIC_ARN_KEY};
use lib::common_service::CommonService;
use serde_json::json;
use uuid::Uuid;


use crate::handler_params::{ GetJobsQueryParams, StartAnalysisBodyParams, UploadPresignURLQueryParams};


fn build_error_response(message: &str) -> Response {
    let mut json_header = HeaderMap::new();
    json_header.insert(CONTENT_TYPE, "application/json".parse().unwrap());

    let mut response = Response::new(json!({
        "success": false,
        "message": message
    }).to_string());
    *response.status_mut() = StatusCode::BAD_REQUEST;
    return (json_header, response).into_response();
}


pub async fn get_upload_url(
    State(service): State<CommonService>,
    Query(params): Query<UploadPresignURLQueryParams>,
) -> Response {
    let Ok(bucket_name) = std::env::var(S3_BUCKET_NAME_KEY) else {
        return build_error_response("Environment variables not defined.");
    };

    let s3_folder = Uuid::new_v4().to_string();
    let s3_key: String = format!("{}/{}", s3_folder, params.filename);

    let url = match service.s3.put_object_presigned(&bucket_name, &s3_key, &params.content_type).await {
        Ok(url) => url,
        Err(err) => {
            return build_error_response(&format!("Error getting presgined url: {}.", err));
        },
    };

    let mut json_header = HeaderMap::new();
    json_header.insert(CONTENT_TYPE, "application/json".parse().unwrap());

    let response = Response::new(json!({
        "url": url,
        "object_folder": s3_folder,
        "filename": params.filename,
        "expired_in": PRESIGNED_VALID_DURATION_UPLOAD
    }).to_string());

    return (json_header, response).into_response();

}



pub async fn start_analysis(
    State(service): State<CommonService>,
    Json(params): Json<StartAnalysisBodyParams>
) -> Response {
    let (Ok(bucket_name), Ok(role_arn), Ok(topic_arn), Ok(table_name)) = (std::env::var(S3_BUCKET_NAME_KEY), std::env::var(ROLE_ARN_KEY), std::env::var(TOPIC_ARN_KEY), std::env::var(TABLE_NAME_KEY)) else {
        return build_error_response("Environment variables not defined.");
    };

    let s3_key: String = format!("{}/{}", params.s3_folder_name, params.filename);

    let job_id = match service.rekognition.start_tracking(&bucket_name, &s3_key, &role_arn, &topic_arn).await {
        Ok(job_id) => job_id,
        Err(err) => {
            return build_error_response(&format!("Error start tracking: {}", err.to_string()));
        },
    };

    let result = service.dynamo.register_entry(&table_name, &params.user_id, &job_id, &params.s3_folder_name, &params.filename).await;
    if result.is_err() {
        return build_error_response(&format!("Error putting to dynamo: {}", result.err().unwrap().to_string()));
    }

    let mut json_header = HeaderMap::new();
    json_header.insert(CONTENT_TYPE, "application/json".parse().unwrap());

    let response = Response::new(json!({
        "job_id": job_id
    }).to_string());

    return (json_header, response).into_response();

}


// get video url for display
pub async fn get_video_url(
    State(service): State<CommonService>,
    Path(job_id): Path<String>,
) -> Response {
    let (Ok(bucket_name), Ok(table_name)) = (std::env::var(S3_BUCKET_NAME_KEY), std::env::var(TABLE_NAME_KEY)) else {
        return build_error_response("Environment variables not defined.");
    };

    let dynamo_entry = match service.dynamo.get_entry_single(&table_name, &job_id).await {
        Ok(entry) => entry,
        Err(err) => {
            return build_error_response(&format!("Error getting job. Error: {}", err));
        },
    };

    let s3_key: String = format!("{}/{}", dynamo_entry.s3_folder_name, dynamo_entry.filename);

    let url = match service.s3.get_object_presigned(&bucket_name, &s3_key).await {
        Ok(url) => url,
        Err(err) => {
            return build_error_response(&format!("Error getting presgined url: {}.", err));
        },
    };

    let mut json_header = HeaderMap::new();
    json_header.insert(CONTENT_TYPE, "application/json".parse().unwrap());

    let response = Response::new(json!({
        "url": url,
        "expired_in": PRESIGNED_VALID_DURATION_VIEW
    }).to_string());

    return (json_header, response).into_response();

}

// get job results
pub async fn get_results_url(State(service): State<CommonService>, Path(job_id): Path<String>) -> Response {

    let (Ok(bucket_name), Ok(table_name)) = (std::env::var(S3_BUCKET_NAME_KEY), std::env::var(TABLE_NAME_KEY)) else {
        return build_error_response("Environment variables not defined.");
    };

    let dynamo_entry = match service.dynamo.get_entry_single(&table_name, &job_id).await {
        Ok(entry) => entry,
        Err(err) => {
            return build_error_response(&format!("Error getting job. Error: {}", err));
        },
    };
    if dynamo_entry.job_status != JobStatus::Succeeded {
        return build_error_response(&format!("Cannot get results for {:?} jobs", dynamo_entry.job_status));
    }

    let s3_key = format!("{}/{}", dynamo_entry.s3_folder_name, RESULTS_JSON_KEY);

    let url = match service.s3.get_object_presigned(&bucket_name, &s3_key).await {
        Ok(url) => url,
        Err(err) => {
            return build_error_response(&format!("Error getting presgined url: {}.", err));
        },
    };

    let mut json_header = HeaderMap::new();
    json_header.insert(CONTENT_TYPE, "application/json".parse().unwrap());

    let response = Response::new(json!({
        "url": url,
        "expired_in": PRESIGNED_VALID_DURATION_VIEW
    }).to_string());

    return (json_header, response).into_response();
}


// get job summary
pub async fn get_summary(State(service): State<CommonService>, Path(job_id): Path<String>) -> Response {

    let Ok(table_name) = std::env::var(TABLE_NAME_KEY) else {
        return build_error_response("Environment variables not defined.");
    };

    let dynamo_entry = match service.dynamo.get_entry_single(&table_name, &job_id).await {
        Ok(entry) => entry,
        Err(err) => {
            return build_error_response(&format!("Error getting job. Error: {}", err));
        },
    };

    let mut json_header = HeaderMap::new();
    json_header.insert(CONTENT_TYPE, "application/json".parse().unwrap());

    let response = Response::new(json!({
        "job": dynamo_entry,
    }).to_string());

    return (json_header, response).into_response();
}


// get all jobs
// pub async fn get_all_jobs(State(service): State<CommonService>, Path(user_id): Path<String>, last_evaluated_key: Option<Json<Option<LastEvaluatedKey>>>) -> Response {
pub async fn get_all_jobs(State(service): State<CommonService>, Path(user_id): Path<String>, last_evaluated_key: Option<Query<GetJobsQueryParams>>) -> Response {

    let Ok(table_name) = std::env::var(TABLE_NAME_KEY) else {
        return build_error_response("Environment variables not defined.");
    };

    let last_evaluated_key:Option<LastEvaluatedKey> = if let Some(last_evaluated_key) = last_evaluated_key {
        // last_evaluated_key.0
        Some(LastEvaluatedKey::new(&last_evaluated_key.0.job_id, &user_id, &last_evaluated_key.0.request_timestamp))
    } else {
        None
    };

    let (jobs, last_evaluated_key) = match service.dynamo.query_entries(&table_name, &user_id, last_evaluated_key).await {
        Ok(result) => result,
        Err(err) => {
            return build_error_response(&format!("Error getting jobs: {}.", err));
        },
    };

    let mut json_header = HeaderMap::new();
    json_header.insert(CONTENT_TYPE, "application/json".parse().unwrap());

    let response = Response::new(json!({
        "jobs": jobs,
        "last_evaluated_key": last_evaluated_key
    }).to_string());

    return (json_header, response).into_response();
}



pub async fn delete_job(State(service): State<CommonService>, Path(job_id): Path<String>) -> Response {

    let (Ok(bucket_name), Ok(table_name)) = (std::env::var(S3_BUCKET_NAME_KEY), std::env::var(TABLE_NAME_KEY)) else {
        return build_error_response("Environment variables not defined.");
    };

    let dynamo_entry = match service.dynamo.get_entry_single(&table_name, &job_id).await {
        Ok(entry) => entry,
        Err(err) => {
            return build_error_response(&format!("Error deleting job. Error: {}", err));
        },
    };

    // delete s3
    if service.s3.delete_object(&bucket_name, &dynamo_entry.s3_folder_name).await.is_err() {
        return build_error_response(&format!("Error deleting s3 object"))
    };

    // delete dynamo
    if service.dynamo.delete_entry(&table_name, &job_id).await.is_err() {
        return build_error_response(&format!("Error deleting dynamo entry"))
    };

    let mut json_header = HeaderMap::new();
    json_header.insert(CONTENT_TYPE, "application/json".parse().unwrap());

    let response = Response::new(json!({
        "success": true,
    }).to_string());

    return (json_header, response).into_response();
}