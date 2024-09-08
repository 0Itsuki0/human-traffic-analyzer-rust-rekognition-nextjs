
'use client'
// import 'bootstrap/dist/css/bootstrap.min.css'
import React, { Key, useId } from 'react'
import {Divider, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, SharedSelection, SortDescriptor} from "@nextui-org/react"
import {Button, ButtonGroup} from "@nextui-org/react"
import { SearchIcon } from '@/icons/searchIcon'
import { JobEntry, JobStatus, LastEvaluatedKey } from '@/lib/types/dynamoTypes'
import {Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, getKeyValue, Tooltip} from "@nextui-org/react"
import { RotateIcon } from "@/icons/rotateIcon"
import {PressEvent} from "@react-types/shared"
import { ChevronDownIcon } from "@/icons/cheveronDownIcon"
import {Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure} from "@nextui-org/react"
import {Card, CardHeader, CardBody, CardFooter} from "@nextui-org/react"
import Link from "next/link"
import { ArrowRightIcon } from "../icons/arrowRightIcon"


interface FooterProps {
    routes: Route[],
    showDescription: boolean
}

export type Route = RouteNew | RouteLookUp | RouteDashboard;

export const routeNew: RouteNew = {
    title: "New Job",
    description: "Upload a video and start a new tracking analysis.",
    href: "/new"
}

export const routeDashboard: RouteDashboard = {
    title: "Dashboard",
    description: "Check out all past tracking analysis jobs.",
    href: "/dashboard"
}

export const routeLookUp: RouteLookUp = {
    title: "Look Up",
    description: "Look up a tracking analysis job by Job Id.",
    href: "/lookup"
}


interface RouteNew {
    title: "New Job"
    description: "Upload a video and start a new tracking analysis."
    href: "/new"
}

interface RouteLookUp {
    title: "Look Up"
    description: "Look up a tracking analysis job by Job Id."
    href: "/lookup"
}

interface RouteDashboard {
    title: "Dashboard"
    description: "Check out all past tracking analysis jobs."
    href: "/dashboard"
}

export default function Footer({routes, showDescription}: FooterProps) {
    const justify = (routes.length === 1) ? "justify-center" : "justify-between"
    const cardClass = (showDescription) ? "py-2 w-48" : ""
    const headerClass = (showDescription) ? "pb-0 pt-2 px-4 flex-col items-start" : "px-4 flex-col items-center"
    return(
        <div className={`flex flex-row align-middle ${justify} items-center w-[880px]`}>
            {routes.map((route, index) => (
                <Link href={route.href} key={index}>
                    <Card className={cardClass}>
                        <CardHeader className={headerClass}>
                            <div className="font-bold text-large font-mono flex flex-row align-middle justify-center items-center gap-4">
                                {route.title}
                                <ArrowRightIcon className="text-black/80 pointer-events-none flex-shrink-0 text-lg fill-black/80" />
                                </div>
                        </CardHeader>
                        {
                            showDescription ?
                            <>
                                <Divider/>
                                <CardBody className="pt-4 px-4 font-mono text-sm">
                                    {route.description}
                                </CardBody>
                            </>
                            : <></>
                        }

                    </Card>
                </Link>
            ))}
        </div>
    )
}