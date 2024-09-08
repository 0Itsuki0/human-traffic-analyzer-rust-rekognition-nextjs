use aws_config::SdkConfig;

pub mod rekognition_service;
pub mod s3_service;
pub mod dynamo_service;

#[derive(Debug, Clone)]
pub struct CommonService {
    pub s3: s3_service::S3Service,
    pub dynamo: dynamo_service::DynamoService,
    pub rekognition: rekognition_service::RekognitionService
}

impl CommonService {
    pub fn new(config: &SdkConfig) -> Self {
        let rekognition_client = aws_sdk_rekognition::Client::new(&config);
        let s3_client = aws_sdk_s3::Client::new(&config);
        let dynamo_client = aws_sdk_dynamodb::Client::new(&config);

        Self {
            s3: s3_service::S3Service::new(&s3_client),
            dynamo: dynamo_service::DynamoService::new(&dynamo_client),
            rekognition: rekognition_service::RekognitionService::new(&rekognition_client)
        }
    }
}