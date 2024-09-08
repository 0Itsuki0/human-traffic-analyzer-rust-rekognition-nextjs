'use client'
import React from 'react';
import {Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, SharedSelection, SortDescriptor, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure} from "@nextui-org/react";

import { SearchIcon } from '@/icons/searchIcon';
import { JobEntry, JobStatus, LastEvaluatedKey } from '@/lib/types/dynamoTypes';
import { RotateIcon } from "@/icons/rotateIcon";
import { ChevronDownIcon } from "@/icons/cheveronDownIcon";
import JobTable from "@/components/jobTable";
import Footer, { routeLookUp, routeNew } from "@/components/footer";
import Header from "@/components/header";
import Metadata from '../metadata';
import { UserContext } from '../../lib/UserService';
import { RekognitionService } from '../../lib/RekognitionService';


const rekognitionService = new RekognitionService()

const statusOptions = Object.values(JobStatus)

export default function Dashboard() {
    const {userId, dispatch} = React.useContext(UserContext)
    const {isOpen, onOpenChange, onClose} = useDisclosure();
    const [jobIdToDelete, setJobIdToDelete] = React.useState<string|null>(null);


    const [lastKey, setLastKey] = React.useState<LastEvaluatedKey|null>(null)

    const [jobIdFilterValue, setJobIdFilterValue] = React.useState<string>("")
    const [jobs, setJobs] = React.useState<JobEntry[]>([])

    const [isLoading, setIsLoading] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [error, setError] = React.useState<string|null>(null);
    const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
        column: "requestTimestamp",
        direction: "ascending"
    });
    const [statusFilter, setStatusFilter] = React.useState<SharedSelection>("all");

    const fetchInitialData = async () => {
        setIsLoading(true)

        try {
            const [newJobs, newKey] = await rekognitionService.fetchJobs(userId, null)
            console.log(`${newJobs.length} jobs fetched. Last key: ${newKey}`)
            setJobs(newJobs)
            setLastKey(newKey)
        } catch (error) {
            setError(`${error}`)
        }

        setIsLoading(false)
    }

    const loadMoreData = async () => {
        setIsLoading(true)

        try {
            const [newJobs, newKey] = await rekognitionService.fetchJobs(userId, lastKey)
            console.log(`${newJobs.length} jobs fetched. Last key: ${newKey}`)
            setJobs([...jobs, ...newJobs])
            setLastKey(newKey)
        } catch (error) {
            setError(`${error}`)
        }

        setIsLoading(false)
    }

    React.useEffect(() => {
        fetchInitialData()
    }, []);


    const filteredJobs = React.useMemo(() => {
        let filteredJobs = [...jobs];
        const hasSearchFilter = Boolean(jobIdFilterValue);
        if (hasSearchFilter) {
            filteredJobs = filteredJobs.filter((job) =>
                job.jobId.toLowerCase().includes(jobIdFilterValue.trim().toLowerCase()),
            );
        }

        if (statusFilter !== "all" && Array.from(statusFilter).length !== statusOptions.length) {
            filteredJobs = filteredJobs.filter((job) =>
              Array.from(statusFilter).includes(job.jobStatus),
            );
        }

        return filteredJobs;
    }, [jobs, jobIdFilterValue, statusFilter]);

    const sortedFilteredJobs = React.useMemo(() => {
        console.log(sortDescriptor)
        return [...filteredJobs].sort((a, b) => {
            const first = a[sortDescriptor.column];
            const second = b[sortDescriptor.column];
            const cmp = first < second ? -1 : first > second ? 1 : 0;

            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [sortDescriptor, filteredJobs]);



    async function deleteJob() {
        console.log("delete job: ", jobIdToDelete)
        setIsDeleting(true)

        try {
            await rekognitionService.deleteJob(jobIdToDelete)
            setJobs((prev) => {
                const newJobs = prev.filter((v) => v.jobId!=jobIdToDelete)
                return newJobs
            });
        } catch (error) {
            setError(`${error}`)
        }

        setJobIdToDelete(null)
        setIsDeleting(false)
    }

    return (
        <>
        <Metadata titlePrefix='Dashboard' />
        <main>
            <Header/>

            <div className={`font-mono font-bold text-xl text-center`}>
                ⭐My Jobs⭐
            </div>

            {
                (error != null) ?
                <div className={`font-mono text-red-500 font-semibold text-lg text-center`}>
                    {error} <br/>
                    Please Refresh the page or check back later!
                </div> : <></>
            }

            <div className="flex flex-col gap-4 w-[880px]">
                <div className="flex flex-row flex-nowrap justify-center gap-x-20 w-full">

                    <Input
                        type="text"
                        isClearable={true}
                        variant="faded"
                        placeholder="Filter by JobId..."
                        startContent={<SearchIcon className='text-black/80 fill-black/80'/>}
                        className="text-black/80 font-mono"
                        value={jobIdFilterValue}
                        onValueChange={setJobIdFilterValue}
                    />

                    <div className="flex gap-3">
                        <Dropdown>
                            <DropdownTrigger className="hidden sm:flex">
                                <Button
                                    endContent={<ChevronDownIcon className="text-sm font-semibold" />}
                                    variant="flat"
                                    className='bg-white/90 font-monon text-black/80 font-semibold'
                                >
                                    Status
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection
                                aria-label="Table Columns"
                                closeOnSelect={false}
                                selectedKeys={statusFilter}
                                selectionMode="multiple"
                                classNames={{
                                    base: 'text-black/80'
                                }}
                                onSelectionChange={setStatusFilter}
                            >
                                {statusOptions.map((status) => (
                                    <DropdownItem key={status}>
                                        {status}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>


                        <Button type="button" color="primary"
                            isLoading={isLoading}
                            isDisabled={isLoading}
                            isIconOnly
                            className='bg-white/90 flex-none text-black/80'
                            onPress={fetchInitialData}
                        >
                            <RotateIcon className="text-black/80 pointer-events-none flex-shrink-0 text-lg fill-black/80" />
                        </Button>
                    </div>
                </div>

                <JobTable
                    jobs={sortedFilteredJobs}
                    isLoading={isLoading}
                    onJobDeletePressed={(jobId) => {
                        setJobIdToDelete(jobId)
                        onOpenChange()
                    }}
                    onLoadMoreButtonPressed={
                        lastKey === null ? null :
                        async () => {
                            await loadMoreData()
                        }
                    }
                    sortDescriptor={sortDescriptor}
                    setSortDescriptor={setSortDescriptor}
                />
            </div>

            <Footer routes={[routeNew, routeLookUp]} showDescription={false}/>

            <Modal
                size='sm'
                isOpen={isOpen}
                onClose={onClose}
                hideCloseButton={true}
                classNames={{
                    footer: 'justify-between'
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                        <ModalHeader className="flex flex-col gap-1 text-black/80 text-center">Confirm Deletion</ModalHeader>
                        <ModalBody>
                            <p className='text-black/80 text-center'>
                            Delete Action is not undoable. <br/>
                            Are you sure you want to delete?
                            </p>
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                isDisabled={isDeleting}
                                color="danger" variant="light" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button
                                isLoading={isDeleting}
                                color="danger" onPress={async () => {
                                await deleteJob()
                                onClose()
                            }}>
                                Delete
                            </Button>
                        </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </main>
        </>
    );
}
