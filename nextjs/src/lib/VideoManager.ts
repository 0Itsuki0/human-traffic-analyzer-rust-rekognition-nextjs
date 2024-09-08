import {  fetchTrackingResults, fetchVideoUrl } from "./serverFunctions"
import { TrackingSummary } from "./types/dynamoTypes"
import { PersonDetectionResult, TrackingResult } from "./types/resultTypes"

export class VideoManager {

    async fetchVideoUrl(jobId: string): Promise<string> {
        const videoUrl = await fetchVideoUrl(jobId)
        return videoUrl
    }

    async fetchResults(jobId: string) {
        const trackingResults = await fetchTrackingResults(jobId)
        const sortedResults = trackingResults.sort((a, b) => a.frame - b.frame)
        return sortedResults
    }

    calculatePersonMap(trackingResults: TrackingResult[]): Map<number, [number, number]>{
        var personMap = new Map<number, [number, number]>();

        for (var result of trackingResults) {
            const persons = result.persons
            const frame = result.frame
            console.log(frame)

            for (var person of persons ) {
                const index = person.index
                if (personMap.has(index)) {
                    const current = personMap.get(index)
                    console.log(current)
                    personMap.set(index, [current[0], frame])
                } else {
                    personMap.set(index, [frame, frame])
                }
            }
        }
        console.log(personMap)
        return personMap
    }

    getPersonDetectionResult(trackingResults: TrackingResult[], frame: number): PersonDetectionResult[] {
        let filteredResults = trackingResults.filter((results) => results.frame == frame)
        if (filteredResults.length == 0) {
            return []
        }
        return filteredResults[0].persons
    }

    // frameduration in millisecond
    getRangeSummary(personMap: Map<number, [number, number]>, startFrame: number, endFrame: number, frameDuration: number): TrackingSummary {
        // console.log(personMap)
        const personsInRange = Array.from(personMap.values()).filter((person) => {
            return person[0]<=endFrame
        });
        console.log(personsInRange)
        if (personsInRange.length == 0) {
            return {
                totalDetectionCount: 0,
                averageTrackingTime: 0
            }
        }

        const detectionCount = personsInRange.length
        const detectionTimeSum = personsInRange.map(([start, end], _index) => {
            return Math.min(endFrame, end) - Math.max(startFrame, start)
        }).reduce((sum, current) => sum + current, 0);
        const averageTrackingTime = (detectionCount > 0) ? detectionTimeSum / detectionCount * frameDuration / 1000 : 0

        console.log(detectionCount, averageTrackingTime)

        return {
            totalDetectionCount: detectionCount,
            averageTrackingTime: averageTrackingTime
        }

    }

}