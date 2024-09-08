'use client'
import React, { useRef } from 'react'
import { Slider, Button } from "@nextui-org/react"
import { useParams } from 'next/navigation'
import ReactPlayer from 'react-player'
import Rectangle from '@/components/rect'
import { VideoManager } from '@/lib/VideoManager'
import { PersonDetectionResult, TrackingResult } from '@/lib/types/resultTypes'
import { RekognitionService } from "@/lib/RekognitionService"
import { JobEntry, TrackingSummary, VideoMetadata } from "@/lib/types/dynamoTypes"
import Header from "@/components/header"
import Footer, { routeDashboard, routeLookUp, routeNew } from "@/components/footer"
import { PauseIcon } from "@/icons/pauseIcon"
import { PlayIcon } from "@/icons/playIcon"
import Metadata from '@/app/metadata'


const defaultDuration = 716
const defaultFps = 30
const defaultHeight = 360
const defaultWidth = 640
const maxWidth = 880

const defaultMetadata: VideoMetadata = {
    duration: defaultDuration,
    frameRate: defaultFps,
    frameHeight: defaultHeight,
    frameWidth: defaultWidth
}
const defaultSummary: TrackingSummary = {
    totalDetectionCount: 0,
    averageTrackingTime: 0
}


const videoManager = new VideoManager()
const rekognitionService = new RekognitionService()

export default function ResultPage() {
    const params = useParams<{ jobId: string }>()
    const jobId = params.jobId

    const videoPlayerRef = useRef<ReactPlayer>(null)

    const [job, setJob] = React.useState<JobEntry|null>(null)
    const [metadata, setMetadata] = React.useState<VideoMetadata>(defaultMetadata)
    const [trackingSummary, setTrackingSummary] = React.useState<TrackingSummary>(defaultSummary)
    const [videoUrl, setVideoUrl] = React.useState<string|null>(null)

    const frameCount = React.useMemo(() => {
        return calculateFrameCount(metadata)
    }, [metadata])

    const frameDuration = React.useMemo(() => {
        return calculateFrameDuration(metadata)
    }, [metadata])

    const width = React.useMemo(() => {
        return Math.min(metadata.frameWidth, maxWidth)
    }, [metadata])

    const height = React.useMemo(() => {
        return metadata.frameHeight/metadata.frameWidth * width
    }, [width])

    // const frameCount = Math.round(metadata.duration / 1000 * metadata.frameRate)
    // const frameDuration = 1000/metadata.frameRate

    const [currentFrame, setCurrentFrame] = React.useState(0)
    const [frameRange, setRange] = React.useState([0, 0])
    const [trackingResults, setTrackingResults] = React.useState<TrackingResult[]>([])
    const [personMap, setPersonMap] = React.useState<Map<number, [number, number]>>(new Map<number, [number, number]>())
    const [personsInFrame, setPersonsInFrame] = React.useState<PersonDetectionResult[]>([])
    const [summaryInRange, setSummaryInRange] = React.useState<TrackingSummary>(defaultSummary)

    const [timeInterval, setTimeInterval] = React.useState<NodeJS.Timeout|null>(null)
    const [playing, setPlaying] = React.useState(false)

    const [error, setError] = React.useState<string|null>(null)

    function calculateFrameCount(metadata: VideoMetadata): number {
        return Math.round(metadata.duration / 1000 * metadata.frameRate)
    }

    function calculateFrameDuration(metadata: VideoMetadata): number {
        return 1000/metadata.frameRate
    }

    React.useEffect(() => {
        const initialize = async () => {
            setPlaying(false)

            try {
                const job = await rekognitionService.lookUpJob(jobId)
                if (job.videoMetadata === null) {
                    throw Error('Error getting metadata.')
                }
                setJob(job)
                const metadata = job.videoMetadata
                setMetadata(job.videoMetadata)
                const frameCount = calculateFrameCount(metadata)
                const frameDuration = calculateFrameDuration(metadata)

                const trackingResults = await videoManager.fetchResults(jobId)
                const filteredResults = trackingResults.filter((result) => result.frame <= frameCount)
                setTrackingResults(filteredResults)

                const personMap = videoManager.calculatePersonMap(filteredResults)
                setPersonMap(personMap)

                const url = await videoManager.fetchVideoUrl(jobId)
                setVideoUrl(url)

                setPersonsInFrame(videoManager.getPersonDetectionResult(trackingResults, currentFrame))
                const rangeSummary = videoManager.getRangeSummary(personMap, 0, frameCount, frameDuration)

                setRange([0, frameCount])
                setTrackingSummary(rangeSummary)
                setSummaryInRange(rangeSummary)
            } catch (error) {
                setError(`${error}`)
            }

        }
        initialize()
    }, [jobId])


    const startTimer = () => {
        console.log("start timer")
        // Use setInterval to update the timer every 1000/fps milliseconds
        setTimeInterval(setInterval(() => {
            setCurrentFrame((prev) => {
                const newValue =  (prev == frameRange[1]) ? frameRange[0] : prev + 1
                return newValue
            })
        }, frameDuration))

    }

    const pauseTimer = () => {
        console.log("stop timer")
        if (timeInterval != null) {
            clearInterval(timeInterval)
        }
    }

    React.useEffect(() => {
        console.log("currentFrame", currentFrame)
        const detectionResults = videoManager.getPersonDetectionResult(trackingResults, currentFrame)
        console.log("detectionResults", detectionResults)
        setPersonsInFrame(detectionResults)

        seekTo(currentFrame)
        if (currentFrame == frameRange[1]) {
            setPlaying(false)
        }
    }, [currentFrame])

    const seekTo = (frame: number) =>  {
        videoPlayerRef.current?.seekTo(Math.min(frame/frameCount, 1), "fraction")
    }

    React.useEffect(() => {
        if (playing) {
            startTimer()
        } else {
            pauseTimer()
        }
    }, [playing])


    function onPlayClick() {
        setPlaying((prev) => !prev)
    }


    const handleSeeking = (newFrame: number) => {
        if (newFrame == currentFrame) {
            return
        }
        console.log("handle seeking")
        console.log(newFrame)
        setPlaying(false)

        if (newFrame > frameRange[1] || newFrame < frameRange[0]) {
            return
        }
        setCurrentFrame(newFrame)
    }

    const handleRangeChange = (newRange: number[]) => {
        if (newRange == frameRange) {
            return
        }
        console.log("handle range change")
        setPlaying(false)

        const [newStart, newEnd] = newRange
        console.log(newStart, newEnd)

        const [currentStart, _currentEnd] = frameRange
        console.log(newStart, newEnd)

        if (newStart != currentStart) {
            setCurrentFrame(newStart)
        } else {
            setCurrentFrame(newEnd)
        }
        setRange(newRange)

        const rangeSummary = videoManager.getRangeSummary(personMap, newStart, newEnd, frameDuration)
        setSummaryInRange(rangeSummary)
    }


    return (
        <>
        <Metadata titlePrefix='Result' />
        <main>
            <Header/>

            <div className={`font-mono font-bold text-xl text-center`}>
                ⭐Analaysis Results⭐
            </div>

            {
                (error != null) ?
                <div className={`font-mono text-red-500 font-semibold text-lg text-center`}>
                    {error} <br/>
                    Please Refresh the page or check back later!
                </div> : <></>
            }

            {
                (videoUrl != null) ?
                <div className='flex flex-col gap-4'>
                    <div className='font-mono text-sm flex flex-col gap-2'>
                        <div className='font-semibold text-lg text-center'>{job?.filename}</div>

                        <div className='text-center'>
                            <span className='font-semibold'>Tacking Summary</span><br/>
                            Total Detection: {trackingSummary.totalDetectionCount}<br/>
                            Average Tracking Time: {trackingSummary.averageTrackingTime} sec
                        </div>
                    </div>

                    <div>
                        <div className='relative bg-purple-500' style={{width:`${width}px`, height:`${height}px`}}>
                            <ReactPlayer
                                className='absolute top-0 left-0'
                                id='player'
                                url={videoUrl}
                                playing={false}
                                ref={videoPlayerRef}
                                width='100%'
                                height='100%'
                            />
                            <div className='absolute w-full h-full'>
                                {personsInFrame.map((detectionResult, index) => (
                                    <Rectangle detectionResult={detectionResult} key={index}/>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-row w-full flex-nowrap align-middle justify-between items-center gap-4 px-2 py-1 bg-white/30">
                            <Button type="submit" color="primary"
                                isIconOnly
                                className='bg-white/90'
                                onPress={onPlayClick}
                            >
                                {
                                    playing ?
                                    <PauseIcon className="text-black/80 pointer-events-none flex-shrink-0 text-lg fill-black/80" /> :
                                    <PlayIcon className="text-black/80 pointer-events-none flex-shrink-0 text-lg fill-black/80" />
                                }
                            </Button>

                            <div className='flex flex-col w-full flex-nowrap align-middle justify-between items-center gap-1'>
                                <Slider
                                    aria-label="Temperature"
                                    size="md"
                                    step={1}
                                    maxValue={frameCount}
                                    minValue={0}
                                    value={currentFrame}
                                    defaultValue={0.4}
                                    onChange={handleSeeking}
                                    renderThumb={(props) => (
                                        <div {...props} className="text-black/80 bg-white/90 rounded px-1 py-0.5 text-xs mt-1.5 border-purple-500 border-2 min-w-8 text-center cursor-pointer">
                                            {currentFrame}
                                        </div>
                                    )}
                                    classNames={{
                                        track: "border-s-secondary-100",
                                        filler: "bg-gradient-to-r from-secondary-100 to-secondary-500"
                                    }}
                                />

                                <Slider
                                    aria-label="Temperature"
                                    color="secondary"
                                    size="md"
                                    step={1}
                                    maxValue={frameCount}
                                    minValue={0}
                                    value={frameRange}
                                    // defaultValue={frameRange}
                                    onChange={handleRangeChange}
                                    renderThumb={({index, ...props}) => (
                                        <div {...props} className="text-black/80 bg-white/90 rounded px-1 py-0.5 text-xs mt-1.5 border-purple-500 border-2 min-w-8 text-center cursor-pointer">
                                            {index === 0 ? frameRange[0] : frameRange[1]}
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    <div className='text-center text-sm font-mono'>
                        <span className='font-semibold'>Tacking Summary In Frame: {frameRange[0]} ~ {frameRange[1]}</span><br/>
                        Total Detection: {summaryInRange.totalDetectionCount}<br/>
                        Average Tracking Time: {summaryInRange.averageTrackingTime} sec
                    </div>
                </div>
                :

                (error != null) ?
                <></> :
                <div className="font-mono text-center">
                    Please Wait!
                </div>
            }

            <Footer routes={[routeNew, routeLookUp, routeDashboard]} showDescription={false}/>

        </main>
        </>
    )
}
