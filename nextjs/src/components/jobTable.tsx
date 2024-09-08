'use client'
import React from 'react'
import {SortDescriptor, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tooltip} from "@nextui-org/react"

import { JobEntry, JobStatus } from '@/lib/types/dynamoTypes'
import { TrashIcon } from '@/icons/trashIcon'


interface JobTableProps {
    jobs: JobEntry[],
    isLoading: boolean,
    onJobDeletePressed: (jobId: string) => void | null,
    onLoadMoreButtonPressed: () => void | null
    sortDescriptor: SortDescriptor,
    setSortDescriptor: React.Dispatch<React.SetStateAction<SortDescriptor>>
}


export default function JobTable(
    {
        jobs,
        isLoading,
        onJobDeletePressed,
        onLoadMoreButtonPressed,
        sortDescriptor,
        setSortDescriptor,
    }: JobTableProps
)  {


    var columns = [
        {
            key: "jobId",
            label: "JOB ID",
        },
        {
            key: "filename",
            label: "FILENAME",
        },
        {
            key: "jobStatus",
            label: "STATUS",
            sortable: true
        },
        {
            key: "requestTimestamp",
            label: "REQUEST AT",
            sortable: true
        },
    ]

    if (onJobDeletePressed !== null) {
        columns.push({
            key: "delete",
            label: "",
        })
    }



    const renderCell = React.useCallback((job: JobEntry, columnKey: React.Key) => {
        const cellValue = job[columnKey as string]
        switch (columnKey) {
            case 'jobId':
                return (
                    <Tooltip content={job.jobId} color="secondary" offset={-8}>
                        <div className=''>
                            {job.jobId}
                        </div>
                    </Tooltip>
                )
            case 'jobStatus':
                var backgroundColor = 'bg-red-500'
                switch (job.jobStatus) {
                    case JobStatus.FAILED: {
                        backgroundColor = 'bg-red-500'
                        break
                    }
                    case JobStatus.INPROGRESS: {
                        backgroundColor = 'bg-blue-500'
                        break
                    }
                    case JobStatus.SUCCEEDED: {
                        backgroundColor = 'bg-green-500'
                        break
                    }
                }
                return (
                    <div className={`${backgroundColor} text-center px-2 rounded text-white/80 font-medium`}>{cellValue}</div>
                )
            case 'requestTimestamp':
                return (
                    <div className=''>
                        {new Date(job.requestTimestamp*1000).toLocaleString()}
                    </div>
                )

            case 'delete':
                return (
                    <Button type="button" color="primary"
                    isLoading={isLoading}
                    isDisabled={isLoading}
                    size='sm'
                    isIconOnly
                    className='flex-none text-lg text-white/90 bg-red-500 ml-4'
                    onPress={() => {
                        onJobDeletePressed(job.jobId)
                    }}
                >
                    <TrashIcon className="pointer-events-none flex-shrink-0" />
                    </Button>
                )
            default:
                return cellValue
        }
    }, [])


    return (

        <Table
            aria-label="Job Table"
            isHeaderSticky={true}
            classNames={{
                base: 'font-mono',
                th: 'hover:cursor-default',
                tr: `hover:bg-gray-200`,
                td: `text-black/50 max-w-64 text-ellipsis overflow-hidden whitespace-nowrap`,
                emptyWrapper: `h-12`
            }}
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
            bottomContent={
                onLoadMoreButtonPressed !== null && !isLoading ? (
                  <div className="flex w-full justify-center">
                    <Button
                        isDisabled={isLoading}
                        isLoading={isLoading}
                        onPress={onLoadMoreButtonPressed}>
                        Load More
                    </Button>
                  </div>
                ) : null
              }
        >
            <TableHeader columns={columns}>
                {(column) => (
                    <TableColumn key={column.key} allowsSorting={column.sortable}>
                        {column.label}
                    </TableColumn>
                )}
            </TableHeader>

            <TableBody
                items={jobs}
                isLoading={isLoading}
                emptyContent="No results to display."
                loadingContent="Loading..."
            >
                {(item) => (
                    <TableRow key={item.jobId} href={`${item.jobStatus != JobStatus.SUCCEEDED ? '' : `${item.jobId}/result`}`} className={`${item.jobStatus != JobStatus.SUCCEEDED ? 'cursor-default' : 'cursor-pointer'}`} >
                        {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}
