
use std::collections::HashMap;

use anyhow::{bail, Context, Result};
use aws_sdk_dynamodb::types::AttributeValue;
use serde_dynamo::{from_item, from_items, to_attribute_value, to_item};

use crate::common_structs::{JobStatus, LastEvaluatedKey, RekognitionJobTableEntry, TrackingSummary, VideoMetadata};

#[derive(Debug, Clone)]
pub struct DynamoService {
    client: aws_sdk_dynamodb::Client,
}

impl DynamoService {
    pub fn new(client: &aws_sdk_dynamodb::Client) -> Self {
        Self {
            client: client.to_owned()
        }
    }

    pub async fn register_entry(&self, table_name: &str, user_id: &str, job_id: &str, s3_folder_name: &str, file_name: &str) -> Result<()>{
        let entry = RekognitionJobTableEntry::new(job_id, user_id, s3_folder_name, file_name);
        self
            .client.clone()
            .put_item()
            .table_name(table_name)
            .set_item(Some(to_item(&entry)?))
            .send()
            .await?;

        Ok(())
    }

    pub async fn update_summary(&self, table_name: &str, job_id: &str, tracking_summary: &TrackingSummary) -> Result<()>{
        let attribute_value: aws_sdk_dynamodb::types::AttributeValue = to_attribute_value(&tracking_summary)?;

        self
            .client.clone()
            .update_item()
            .table_name(table_name)
            .key("job_id", AttributeValue::S(job_id.to_owned()))
            .update_expression("set #name = :value")
            .expression_attribute_names("#name", "tracking_summary")
            .expression_attribute_values(":value", attribute_value)
            .send()
            .await?;
        Ok(())
    }

    pub async fn update_metadata(&self, table_name: &str, job_id: &str, metadata: &VideoMetadata) -> Result<()>{
        let attribute_value: aws_sdk_dynamodb::types::AttributeValue = to_attribute_value(&metadata)?;

        self
            .client.clone()
            .update_item()
            .table_name(table_name)
            .key("job_id", AttributeValue::S(job_id.to_owned()))
            .update_expression("set #name = :value")
            .expression_attribute_names("#name", "video_metadata")
            .expression_attribute_values(":value", attribute_value)
            .send()
            .await?;
        Ok(())
    }

    pub async fn update_job_status(&self, table_name: &str, job_id: &str, status: JobStatus) -> Result<()>{
        let attribute_value: aws_sdk_dynamodb::types::AttributeValue = to_attribute_value(&status)?;

        self
            .client.clone()
            .update_item()
            .table_name(table_name)
            .key("job_id", AttributeValue::S(job_id.to_owned()))
            .update_expression("set #name = :value")
            .expression_attribute_names("#name", "job_status")
            .expression_attribute_values(":value", attribute_value)
            .send()
            .await?;
        Ok(())
    }

    pub async fn get_entry_single(&self, table_name: &str, job_id: &str) -> Result<RekognitionJobTableEntry> {
        let results = self
            .client.clone()
            .query()
            .table_name(table_name)
            .key_condition_expression("#name = :value")
            .expression_attribute_names("#name", "job_id")
            .expression_attribute_values(":value", AttributeValue::S(job_id.to_owned()))
            .send()
            .await?;

        if results.count == 0
            || results.items.is_none()
            || results.items.clone().unwrap().is_empty()
        {
            bail!("Job does not exist for id: {}!", job_id)
        }
        let item = results.items.unwrap().first().unwrap().to_owned();
        let entry: RekognitionJobTableEntry = from_item(item)?;
        Ok(entry)
    }

    pub async fn query_entries(&self, table_name: &str, user_id: &str, last_evaluated_key: Option<LastEvaluatedKey>) -> Result<(Vec<RekognitionJobTableEntry>, Option<LastEvaluatedKey>)> {
        let mut builder = self.client.clone()
            .query()
            // .limit(1)
            .scan_index_forward(false)
            .table_name(table_name)
            .index_name("gsi-userid")
            .key_condition_expression("#name = :value")
            .expression_attribute_names("#name", "user_id")
            .expression_attribute_values(":value", AttributeValue::S(user_id.to_owned()));


            if let Some(last_evaluated_key) = last_evaluated_key {
            let mut exclusive_key: HashMap<String, AttributeValue> = HashMap::new();
            exclusive_key.insert("job_id".to_owned(), AttributeValue::S(last_evaluated_key.job_id));
            exclusive_key.insert("user_id".to_owned(), AttributeValue::S(last_evaluated_key.user_id));
            exclusive_key.insert("request_timestamp".to_owned(), AttributeValue::N(last_evaluated_key.request_timestamp.to_string()));

            builder = builder.set_exclusive_start_key(Some(exclusive_key));
        }
        let results = builder.send().await?;

        println!("results.items: {:?}", results.items);

        let items = results.items.context("items not available")?;
        let entries: Vec<RekognitionJobTableEntry> = from_items(items)?;
        println!("entries: {:?}", entries);

        let last_evaluated_key: Option<LastEvaluatedKey> = match results.last_evaluated_key {
            Some(key) => from_item(key)?,
            None => None,
        };

        println!("last_evaluated_key: {:?}", last_evaluated_key);
        Ok((entries, last_evaluated_key))
    }

    pub async fn delete_entry(&self, table_name: &str, job_id: &str) -> Result<()> {
        self.client.clone()
            .delete_item()
            .table_name(table_name)
            .key("job_id", AttributeValue::S(job_id.to_owned()))
            .send()
            .await?;

        Ok(())
    }

}