'use server'

import { objectToCamel } from "ts-case-convert"
import { TrackingResult } from "./types/resultTypes"
import { JobEntry, LastEvaluatedKey } from "./types/dynamoTypes"

const endpoint: string = process.env.API_ENDPOINT ?? ""

export async function fetchJobSummary(jobId: string): Promise<JobEntry> {
    if (!checkEndpoint()) {
        throw Error('endpoint not available')
    }

    const url = new URL(`${endpoint}${jobId}`)
    const response = await fetch(url)
    const responseJson = await response.json()
    console.log(responseJson)

    if (!response.ok) {
        throw Error(responseJson.message ?? "Unknwon Error")
    }

    const job: JobEntry = objectToCamel(responseJson.job) as JobEntry
    console.log(job)

    return job
}


export async function fetchTrackingResults(jobId: string): Promise<TrackingResult[]> {
    if (!checkEndpoint()) {
        throw Error('endpoint not available')
    }

    const resultsUrl = new URL(`${endpoint}${jobId}/results_url`)
    const resultsUrlResponse = await fetch(resultsUrl)
    const resultsResponseJson = await resultsUrlResponse.json()
    console.log(resultsResponseJson)
    if (!resultsUrlResponse.ok) {
        throw Error(resultsResponseJson.message ?? "Unknwon Error")
    }

    const jsonUrl = resultsResponseJson.url
    const response = await fetch(jsonUrl)
    if (!response.ok) {
        throw Error('Error getting json results.')
    }
    const json = await response.json()
    const results: TrackingResult[] = objectToCamel(json) as TrackingResult[]

    return results
}

export async function fetchVideoUrl(jobId: string): Promise<string> {
    if (!checkEndpoint()) {
        throw Error('endpoint not available')
    }

    const url = new URL(`${endpoint}${jobId}/video_url`)
    const response = await fetch(url)
    const responseJson = await response.json()
    // console.log(responseJson)

    if (!response.ok) {
        throw Error(responseJson.message ?? "Unknwon Error")
    }

    return responseJson.url
}



export async function startTrackingJob(userId: string, formData: FormData): Promise<string> {
    if (!checkEndpoint()) {
        throw Error('endpoint not available')
    }

    const file = formData.get('file') as File

    // get upload url
    var uploadUrl = new URL(`${endpoint}upload_url`)
    const uploadOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    }
    uploadUrl.searchParams.append('filename', file.name);
    uploadUrl.searchParams.append('content_type', file.type);

    const uploadResponse = await fetch(uploadUrl, uploadOptions)
    const uploadResponseJson = await uploadResponse.json()
    console.log(uploadResponseJson)
    if (!uploadResponse.ok) {
        throw Error(uploadResponseJson.message ?? "Unknwon Error")
    }

    const presignedUrl = uploadResponseJson.url as string
    const objectFolder = uploadResponseJson.object_folder as string
    console.log("presignedUrl: ", presignedUrl)

    // post file to url
    const putFileOptions = {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
    }
    const putFileResponse = await fetch(presignedUrl, putFileOptions)
    console.log(putFileResponse)
    if (!putFileResponse.ok) {
        throw Error("Error uploading File.")
    }

    // start analysis
    var startUrl = new URL(`${endpoint}start_analysis`)
    const startOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            s3_folder_name: objectFolder,
            filename: file.name,
        })
    }
    const startResponse = await fetch(startUrl, startOptions)
    console.log(startResponse)
    const startResponseJson = await startResponse.json()
    console.log(startResponseJson)
    if (!startResponse.ok) {
        throw Error(startResponseJson.message ?? "Unknwon Error")
    }

    let jobId = startResponseJson.job_id
    return jobId
}

export async function fetchTrackingJobs(userId: string, lastEvaluatedKey: LastEvaluatedKey|null): Promise<[JobEntry[], LastEvaluatedKey|null]> {
    if (!checkEndpoint) {
        throw Error('endpoint not available')
    }
    var options = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    }
    var url = new URL(`${endpoint}${userId}/jobs`)
    if (lastEvaluatedKey != null) {
        url.searchParams.append('job_id', lastEvaluatedKey.jobId);
        url.searchParams.append('request_timestamp', lastEvaluatedKey.requestTimestamp.toString());
    }

    const response = await fetch(url, options)
    const responseJson = await response.json()
    console.log(responseJson)
    if (!response.ok) {
        throw Error(responseJson.message ?? "Unknwon Error")
    }

    const jobs: JobEntry[] = objectToCamel(responseJson.jobs) as JobEntry[]
    const newLastEvaluatedKey: LastEvaluatedKey|null = objectToCamel(responseJson.last_evaluated_key) as LastEvaluatedKey|null
    console.log(jobs)

    return [jobs, newLastEvaluatedKey]
}

export async function deleteTrackingJob(jobId: string) {
    if (!checkEndpoint()) {
        throw Error('endpoint not available')
    }
    const options = {
        method: 'DELETE',
    }
    const url = new URL(`${endpoint}${jobId}`)
    const response = await fetch(url, options)
    const responseJson = await response.json()
    console.log(responseJson)

    if (!response.ok) {
        throw Error(responseJson.message ?? "Unknwon Error")
    }

    return
}


function checkEndpoint(): boolean {
    return (endpoint !== "")
}