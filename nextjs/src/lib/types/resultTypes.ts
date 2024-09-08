export type TrackingResult = {
    frame: number,
    persons: PersonDetectionResult[]
}

export type PersonDetectionResult = {
    index: number,
    boundingBox: PersonBoundingBox
}

export type PersonBoundingBox = {
    width: number,
    height: number,
    left: number
    top: number,
}