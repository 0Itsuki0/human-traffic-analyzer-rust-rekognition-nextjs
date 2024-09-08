

use std::time::Duration;

use anyhow::Result;
use aws_sdk_s3::{presigning::PresigningConfig, primitives::ByteStream};
use axum::body::Bytes;

use crate::constants::{PRESIGNED_VALID_DURATION_UPLOAD, PRESIGNED_VALID_DURATION_VIEW};


#[derive(Debug, Clone)]
pub struct S3Service {
    client: aws_sdk_s3::Client,
}

impl S3Service {
    pub fn new(client: &aws_sdk_s3::Client) -> Self {
        Self {
            client: client.to_owned()
        }
    }

    pub async fn put_object(
        &self,
        bucket_name: &str,
        key: &str,
        bytes: Bytes,
        content_type: &str
    ) -> Result<()> {

        let body = ByteStream::from(bytes.clone());
        self.client.clone()
            .put_object()
            // .content_length(bytes.clone().len() as i64)
            .content_type(content_type)
            .bucket(bucket_name)
            .key(key)
            .body(body)
            .send()
            .await?;

        Ok(())
    }

    pub async fn delete_object(
        &self,
        bucket_name: &str,
        key: &str,
    ) -> Result<()> {

        self.client.clone()
            .delete_object()
            .bucket(bucket_name)
            .key(key)
            .send()
            .await?;

        Ok(())
    }

    // pub async fn get_object(
    //     &self,
    //     bucket_name: &str,
    //     key: &str
    // ) -> Result<(Vec<u8>, String)> {

    //     let response = self.client.clone()
    //         .get_object()
    //         .bucket(bucket_name)
    //         .key(key)
    //         .send()
    //         .await?;

    //     let content_type = &response.content_type.context("content type not available")?;
    //     println!("{}", content_type);

    //     let byte_stream = response.body;
    //     let bytes = byte_stream.collect().await?.to_vec();

    //     Ok((bytes, content_type.to_owned()))
    // }

    pub async fn put_object_presigned(
        &self,
        bucket_name: &str,
        key: &str,
        content_type: &str,
    ) -> Result<String> {
        let expires_in = Duration::from_secs(PRESIGNED_VALID_DURATION_UPLOAD);

        let presigned_request = self.client.clone()
            .put_object()
            .content_type(content_type)
            .bucket(bucket_name)
            .key(key.to_owned())
            .presigned(PresigningConfig::expires_in(expires_in)?)
            .await?;

        println!("Object URI: {}", presigned_request.uri());
        Ok(presigned_request.uri().to_owned())
    }

    pub async fn get_object_presigned(
        &self,
        bucket_name: &str,
        key: &str
    ) -> Result<String> {
        let expires_in = Duration::from_secs(PRESIGNED_VALID_DURATION_VIEW);

        let presigned_request = self.client.clone()
            .get_object()
            .bucket(bucket_name)
            .key(key.to_owned())
            .presigned(PresigningConfig::expires_in(expires_in)?)
            .await?;

        println!("Object URI: {}", presigned_request.uri());

        Ok(presigned_request.uri().to_owned())
    }
}