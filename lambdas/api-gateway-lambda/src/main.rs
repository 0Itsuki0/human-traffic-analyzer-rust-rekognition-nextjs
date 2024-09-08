use axum::Router;
use axum::extract::DefaultBodyLimit;
use axum::routing::delete;
use axum::routing::{get, post};
use handlers::{ delete_job, get_all_jobs, get_results_url, get_summary, get_upload_url, get_video_url, start_analysis};
use lambda_http::{run, tracing, Error};
use lib::common_service::CommonService;
use tower_http::limit::RequestBodyLimitLayer;
use std::env::set_var;

pub mod handlers;
pub mod handler_params;

#[tokio::main]
async fn main() -> Result<(), Error> {
    set_var("AWS_LAMBDA_HTTP_IGNORE_STAGE_IN_PATH", "true");

    tracing::init_default_subscriber();

    let config = aws_config::load_from_env().await;
    let common_service = CommonService::new(&config);

    let app = Router::new()
        // start a job
        .route("/upload_url", get(get_upload_url))
        .route("/start_analysis", post(start_analysis))

        // get results for a job
        .route("/:job_id", get(get_summary))
        .route("/:job_id/video_url", get(get_video_url))
        .route("/:job_id/results_url", get(get_results_url))

        // list all jobs for a user
        .route("/:user_id/jobs", get(get_all_jobs))

        // delete job
        .route("/:job_id", delete(delete_job))

        // states
        .with_state(common_service)

        // Set a different limit: 1GB
        .layer(DefaultBodyLimit::disable())
        .layer(RequestBodyLimitLayer::new(10 * 1000 * 1000));

    run(app).await
}