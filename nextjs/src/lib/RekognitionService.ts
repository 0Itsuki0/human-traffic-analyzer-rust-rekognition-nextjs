import { JobEntry, LastEvaluatedKey } from "./types/dynamoTypes"
import { deleteTrackingJob, fetchJobSummary, fetchTrackingJobs, startTrackingJob } from "./serverFunctions"

export class RekognitionService {
    endpoint: string = process.env.API_ENDPOINT ?? ""

    async startJob(userId: string, form: FormData): Promise<string> {
        const jobId = await startTrackingJob(userId, form)
        return jobId
    }

    async fetchJobs(userId: string, lastEvaluatedKey: LastEvaluatedKey|null): Promise<[JobEntry[], LastEvaluatedKey|null]> {
        const [jobs, newLastEvaluatedKey] = await fetchTrackingJobs(userId, lastEvaluatedKey)
        return [jobs, newLastEvaluatedKey]
    }

    async lookUpJob(jobId: string): Promise<JobEntry>  {
        const job = await fetchJobSummary(jobId)
        return job
    }

    async deleteJob(jobId: string) {
        await deleteTrackingJob(jobId)
        return
    }
}