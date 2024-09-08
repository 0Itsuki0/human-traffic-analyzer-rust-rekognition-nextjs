use std::{collections::HashMap, time::{SystemTime, UNIX_EPOCH}};

use aws_sdk_rekognition::types::PersonDetection;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all(deserialize = "PascalCase"))]
pub struct RekognitionSNSMessage {
    pub job_id: String,
    pub status: JobStatus,
    #[serde(rename(deserialize = "API"))]
    pub api: String,
    pub video: VideoObject
}


#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "PascalCase")]
pub struct VideoObject {
    pub s3_object_name: String,
    pub s3_bucket: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum JobStatus {
    Failed,
    InProgress,
    Succeeded,
    #[serde(untagged)]
    Unknown(String),
}


#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub struct VideoMetadata {
    // video total duration in millisecond
    pub duration: i64,
    // Number of frames per second in the video
    pub frame_rate: f32,
    // Vertical pixel dimension of the video.
    pub frame_height: i64,
    // Horizontal pixel dimension of the video.
    pub frame_width: i64
}

impl VideoMetadata {
    pub fn new(metadata: aws_sdk_rekognition::types::VideoMetadata) -> Self {
        return Self{
            duration: metadata.duration_millis.unwrap_or(0),
            frame_rate: metadata.frame_rate.unwrap_or(30.0),
            frame_height: metadata.frame_height.unwrap_or(9*400),
            frame_width: metadata.frame_width.unwrap_or(16*400)
        };
    }
}


#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub struct TrackingSummary {
    pub total_detection_count: usize,
    // in second
    pub average_tracking_time: f64,
}

impl  TrackingSummary {
    pub fn new(mut person_detections: Vec<PersonDetection>) -> Self {
         // index: (first_detect_timestamp, last_detect_timestamp)
        let mut results_map: HashMap<i64, (i64, i64)> = HashMap::new();
        person_detections.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        for detection in person_detections {
            let Some(person) = detection.person else {
                continue;
            };
            let index = person.index;
            let timestamp = detection.timestamp;
            if results_map.contains_key(&index) {
                // update last detect time
                results_map.entry(index).and_modify(|result| result.1 = timestamp);

            } else {
                // newly detected
                results_map.insert(index, (timestamp, timestamp));
            }
        }

        let total_detection_count = results_map.len();
        let tracking_time_vector: Vec<f64> = results_map.values().map(|(first, last)| ((last - first) as f64)/1000.0).collect();
        let sum: f64 = tracking_time_vector.iter().sum();
        let mut average_tracking_time: f64 = 0.0;
        if total_detection_count > 0 {
            average_tracking_time = sum/(total_detection_count as f64)
        }
        Self { total_detection_count, average_tracking_time }
    }

}


#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub struct TrackingResult {
    // frame count
    pub frame: i64,
    pub persons: Vec<PersonDetectionResult>
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub struct PersonDetectionResult {
    pub index: i64,
    pub bounding_box: PersonBoundingBox
}

impl PersonDetectionResult {
    pub fn new(person_detection: &PersonDetection) -> Option<Self> {
        let Some(person) = person_detection.to_owned().person else {
            return None;
        };
        let Some(bounding_box) = person.bounding_box else {
            return None;
        };
        let (Some(width), Some(height), Some(left), Some(top)) = (bounding_box.width, bounding_box.height, bounding_box.left, bounding_box.top) else {
            return None
        };
        return Some(
            Self  {
                index: person.index,
                bounding_box: PersonBoundingBox { width, height, left, top }
            }
        )
    }
}


#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub struct PersonBoundingBox {
    pub width: f32,
    pub height: f32,
    pub left: f32,
    pub top: f32,
}


impl TrackingResult {

    pub fn new_vec(person_detections: Vec<PersonDetection>, frame_rate: f32) -> Vec<Self> {
        // frame duration in milliseconds
        let frame_duration = 1000.0/frame_rate;

        // timestamp: [PersonDetectionResult]
        let mut results_map: HashMap<i64, Vec<PersonDetectionResult>> = HashMap::new();
        for detection in person_detections {
            let Some(person) = PersonDetectionResult::new(&detection) else {
                continue;
            };
            let timestamp = detection.timestamp;
            if results_map.contains_key(&timestamp) {
                results_map.entry(timestamp).and_modify(|detail_array| detail_array.push(person));

            } else {
                results_map.insert(timestamp, vec![person]);
            }
        }

        let results: Vec<TrackingResult> = results_map
            .into_iter()
            .map(|result| TrackingResult {
                frame: Self::timestamp_to_frame(result.0, frame_duration),
                persons: result.1
            })
            .collect();

        return results;
    }


    fn timestamp_to_frame(timestamp: i64, frame_duration: f32) -> i64 {
        let frame_float = timestamp as f32 / frame_duration;
        return frame_float.round() as i64
    }
}



#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct RekognitionJobTableEntry {
    pub job_id: String,
    pub user_id: String,
    pub s3_folder_name: String,
    pub filename: String,
    // timestamp in seconds
    pub request_timestamp: u64,
    pub job_status: JobStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tracking_summary:Option<TrackingSummary>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_metadata:Option<VideoMetadata>,
}

impl RekognitionJobTableEntry {
    pub fn new(job_id: &str, user_id: &str, s3_folder_name: &str, file_name: &str) -> Self{
        let timestamp : u64 = match SystemTime::now().duration_since(UNIX_EPOCH) {
            Ok(timestamp) => timestamp.as_secs(),
            Err(_) => 0,
        };

        Self {
            job_id: job_id.to_owned(),
            user_id: user_id.to_owned(),
            s3_folder_name: s3_folder_name.to_owned(),
            filename: file_name.to_owned(),
            request_timestamp: timestamp,
            job_status: JobStatus::InProgress,
            tracking_summary: None,
            video_metadata: None
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct LastEvaluatedKey {
    pub job_id: String,
    pub user_id: String,
    pub request_timestamp: u64,
}

impl LastEvaluatedKey {
    pub fn new(job_id: &str, user_id: &str, request_timestamp: &u64) -> Self{
        Self {
            job_id: job_id.to_owned(),
            user_id: user_id.to_owned(),
            request_timestamp: request_timestamp.to_owned()
        }
    }
}