'use client'
import React from 'react';
import { Button } from "@nextui-org/react";

import { UserContext } from '../../lib/UserService';
import { RekognitionService } from '../../lib/RekognitionService';
import Footer, { routeDashboard, routeLookUp } from '@/components/footer';
import Header from '@/components/header';
import Metadata from '../metadata';

const rekognitionService = new RekognitionService()

export default function UploadPage() {
    const [file, setFile] = React.useState<File|null>(null)
    const {userId, dispatch} = React.useContext(UserContext)
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string|null>(null);
    const [jobId, setJobId] = React.useState<string|null>(null);

    async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (file == null) {
            return
        }
        setIsLoading(true)

        try {
            const form = new FormData()
            form.append('file', file)
            const jobId = await rekognitionService.startJob(userId, form)
            console.log("jobId: ", jobId)
            setJobId(jobId)
        } catch (error) {
            setError(`${error}`)
        }

        setIsLoading(false)

    }

    function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        console.log(event.target.files)
        const files = event.target.files
        if (files == null) {
            return
        }
        setFile(event.target.files![0])
    }


    return (
        <>
        <Metadata titlePrefix='New Job'/>

        <main>
            <Header/>

            <div className={`font-mono font-bold text-xl text-center`}>
                ⭐New Analaysis Job⭐
            </div>

            {
                (error != null) ?
                <div className={`font-mono text-red-500 font-semibold text-lg text-center`}>
                    {error} <br/>
                    Please Refresh the page or check back later!
                </div> : <></>
            }

            <div className={`font-mono font-bold text-lg text-center`}>
                Upload a File and Start a New Tracking Analysis Job!
            </div>

            <div className={`font-mono text-sm`}>
                Supported file formats: MPEG-4 and MOV<br/>
                Max size: up to 10 GB <br/>
                Max lenght: up to 6 hours <br/>
            </div>


            <form onSubmit={handleFormSubmit}>
                <div className="flex flex-row flex-nowrap justify-center gap-x-8">
                    <div  className="flex items-center justify-between border-2 hover:border-gray-400 rounded-xl transition-colors duration-300">
                        <input
                            type="file"
                            name="video file"
                            accept=".mp4, .mov"
                            required
                            onChange={handleFileSelect}
                            className="block w-full text-sm text-white/80 px-1 file:px-4 file:py-1 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-red-500 hover:file:bg-gray-300"
                        />
                    </div>

                    <Button
                        type="submit" color="primary"
                        isLoading={isLoading}
                        isDisabled={isLoading}
                        className='bg-white/90 flex-none text-black/80'
                    >
                        Send!
                    </Button>
                </div>

            </form>


            {
                (jobId != null) ?
                <div className='flex flex-col gap-4 font-mono text-sm'>
                    <div className='font-semibold text-green-500'>
                        Upload Success!
                    </div>

                    <div>
                        <span className='font-semibold'>JobId: </span>{jobId}<br/>
                    </div>

                    <div className={`font-mono text-sm`}>
                        Please Note down the JobId for future reference!<br/>
                        You can either <a href='/lookup' className="text-blue-500 underline underline-offset-4">look up</a> with the JobId, or
                        find it in your <a href='/dashboard' className="text-blue-500 underline underline-offset-4">dashboard</a> page.
                    </div>
                </div> : <></>
            }

            <Footer routes={[routeLookUp, routeDashboard]} showDescription={false}/>


        </main>
        </>
    );
}
