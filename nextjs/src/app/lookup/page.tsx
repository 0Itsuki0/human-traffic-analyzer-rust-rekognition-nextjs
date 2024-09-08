'use client'
import React from 'react';
import {Input, SortDescriptor, Button} from "@nextui-org/react";

import { SearchIcon } from '@/icons/searchIcon';
import { JobEntry } from '@/lib/types/dynamoTypes';
import JobTable from "@/components/jobTable";
import Footer, { routeDashboard, routeNew } from "@/components/footer";
import Header from "@/components/header";
import Metadata from '../metadata';
import { RekognitionService } from '../../lib/RekognitionService';


const rekognitionService = new RekognitionService()

export default function UploadPage() {
    const [jobId, setJobId] = React.useState<string>("")
    const [jobs, setJobs] = React.useState<JobEntry[]>([])
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string|null>(null);
    const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
        column: "requestTimestamp",
        direction: "ascending"
    });


    async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (jobId.trim().length === 0) {
            setError("Please enter something!")
            return
        }

        setIsLoading(true)

        try {
            setError(null)
            setJobs([])
            let job = await rekognitionService.lookUpJob(jobId)
            console.log("job: ", job)
            console.log(job.videoMetadata)
            setJobs([job])

        } catch (error) {
            console.log(error)
            setError(`${error}`)
        }

        setIsLoading(false)

    }

    function onInputValueChange(value: string) {
        setJobId(value)
        setError(null)
    }


    return (
        <>
        <Metadata titlePrefix='Look Up'/>

        <main>
            <Header/>

            <div className={`font-mono font-bold text-xl text-center`}>
                ⭐Look Up⭐
            </div>

            <div className="flex flex-col gap-4 w-[880px]" >

                <form onSubmit={handleFormSubmit} className='w-full'>
                    <div className="flex flex-row flex-nowrap justify-center gap-x-28 w-full">
                    <Input
                        type="text"
                        isClearable={true}
                        variant="faded"
                        placeholder="Job Id"
                        isInvalid={error != null}
                        errorMessage={error}
                        className="text-black/80 font-mono"
                        value={jobId}
                        onValueChange={onInputValueChange}
                        />

                        <Button type="submit" color="primary"
                            isLoading={isLoading}
                            isDisabled={isLoading}
                            isIconOnly
                            className='bg-white/90'
                        >
                            <SearchIcon className="text-black/80 pointer-events-none flex-shrink-0 text-lg fill-black/80" />

                        </Button>

                    </div>

                </form>

                <JobTable
                    jobs={jobs}
                    isLoading={isLoading}
                    onJobDeletePressed={null}
                    onLoadMoreButtonPressed={null}
                    sortDescriptor={sortDescriptor}
                    setSortDescriptor={setSortDescriptor}
                />
            </div>

            <Footer routes={[routeNew, routeDashboard]} showDescription={false}/>


        </main>
        </>
    );
}
