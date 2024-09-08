
import { PersonDetectionResult } from "../lib/types/resultTypes";

// export default function Rectangle({ top, left, width, height, index }: { top: number, left: number, width: number, height: number, index: number }) {
export default function Rectangle({ detectionResult }: { detectionResult: PersonDetectionResult }) {
        return (
        <div className='absolute border-red-500 border-2' style={{top:`${detectionResult.boundingBox.top*100}%`, left:`${detectionResult.boundingBox.left*100}%`, width:`${detectionResult.boundingBox.width*100}%`, height:`${detectionResult.boundingBox.height*100}%`}}>
            <p className='absolute -top-8 text-red-500 text-nowrap font-mono'>Index: {detectionResult.index}</p>
        </div>
    )
}