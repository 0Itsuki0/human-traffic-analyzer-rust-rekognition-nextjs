
use anyhow::{Context, Result};
use aws_sdk_rekognition::types::{NotificationChannel, PersonDetection, S3Object, Video};

use crate::common_structs::VideoMetadata;

#[derive(Debug, Clone)]
pub struct RekognitionService {
    client: aws_sdk_rekognition::Client,
}

impl RekognitionService {
    pub fn new(client: &aws_sdk_rekognition::Client) -> Self {
        Self {
            client: client.to_owned()
        }
    }

    pub async fn start_tracking(
        &self,
        s3_bucket_name: &str,
        s3_key_name: &str,
        role_arn: &str,
        topic_arn: &str
    ) -> Result<String> {

        let s3_object = S3Object::builder()
            .bucket(s3_bucket_name)
            .name(s3_key_name)
            .build();

        let video = Video::builder()
            .s3_object(s3_object.clone())
            .build();

        let notification_channel = NotificationChannel::builder()
            .role_arn(role_arn)
            .sns_topic_arn(topic_arn)
            .build()?;

        let response = self.client.clone()
            .start_person_tracking()
            .video(video)
            .notification_channel(notification_channel)
            .send()
            .await?;

        // println!("{:?}", response);

        let job_id = response.job_id.context("Job Id not available")?;
        println!("Start job id: {}", job_id);

        Ok(job_id)
    }


    pub async fn get_persons_detection_results(
        &self,
        job_id: &str
    ) -> Result<(Vec<PersonDetection>, Option<VideoMetadata>)> {
        let mut persons_detection: Vec<PersonDetection> = vec![];
        let tracking_builder = self.client.clone()
            .get_person_tracking()
            .job_id(job_id)
            .sort_by(aws_sdk_rekognition::types::PersonTrackingSortBy::Timestamp);

        let response = tracking_builder.clone().send().await?;
        let metadata = response.video_metadata.map(|metadata| VideoMetadata::new(metadata));
        println!("metadata: {:?}", metadata);

        let mut persons = response.persons.context("persons detection not available")?;
        persons_detection.append(&mut persons);
        let mut next_token = response.next_token;

        // println!("persons: {}, token: {:?}", persons.len(), next_token);

        while !next_token.is_none() {
            let token = next_token.clone().unwrap();

            let next_response = tracking_builder
                .clone()
                .next_token(token)
                .send().await?;
            println!("{:?}", next_response);

            let mut next_persons = next_response.persons.context("persons detection not available")?;
            persons_detection.append(&mut next_persons);
            next_token = next_response.next_token;
            println!("persons: {}, token: {:?}", persons.len(), next_token);

        }

        Ok((persons_detection, metadata))
    }

}