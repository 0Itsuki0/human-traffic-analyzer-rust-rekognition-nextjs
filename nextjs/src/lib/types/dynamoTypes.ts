export type VideoMetadata = {
    // video total duration in millisecond
    duration: number,
    // Number of frames per second in the video
    frameRate: number,
    frameHeight: number,
    frameWidth: number
}

export type TrackingSummary = {
    totalDetectionCount: number,
    averageTrackingTime: number
}

export enum JobStatus {
    FAILED = "FAILED",
    INPROGRESS = "INPROGRESS",
    SUCCEEDED = "SUCCEEDED",
}

export type JobEntry = {
    jobId: string,
    userId: string,
    s3FolderName: string,
    filename: string,
    // timestamp in seconds
    requestTimestamp: number,
    jobStatus: JobStatus,
    trackingSummary: TrackingSummary | null,
    videoMetadata: VideoMetadata | null,
}

export type LastEvaluatedKey = {
    jobId: string,
    userId: string,
    requestTimestamp: number,
}