
'use client'
import { Card, CardHeader } from "@nextui-org/react";
import Link from "next/link";
import { ArrowLeftIcon } from "../icons/arrowLeftIcon";

export default function Header() {
    return(
        <div className="h-0 overflow-visible w-[880px] -mb-8">
            <Link href='/'>
                <Card className="max-w-min">
                    <CardHeader className="px-4 flex-col items-center">
                        <div className="font-bold text-large font-mono flex flex-row align-middle justify-center items-center gap-4">
                            <ArrowLeftIcon className="text-black/80 pointer-events-none flex-shrink-0 text-lg fill-black/80" />
                            TOP
                        </div>
                    </CardHeader>
                </Card>
            </Link>
         </div>
    )
}