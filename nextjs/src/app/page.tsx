'use client'


import { ArrowRightIcon } from "@/icons/arrowRightIcon";
import Footer, { routeDashboard, routeLookUp, routeNew } from "@/components/footer";
import {Divider, Slider} from "@nextui-org/react";
import {Card, CardHeader, CardBody, CardFooter} from "@nextui-org/react";
import {Button} from '@nextui-org/react';
import Link from "next/link";
import React from "react";
import Metadata from "./metadata";

export default function Home() {

    return (
        <>
        <Metadata />

        <main className='gap-16'>
            <div className='flex flex-col gap-4 font-mono text-3xl font-bold text-white/80'>
                ⭐Itsuki Human Traffic Analyzer!⭐
            </div>

            <div className={`font-mono text-md text-center`}>
                A tool for analyzing human traffic. <br/>
                Powered by Amazon Rekognition.
            </div>

            <Footer routes={[routeNew, routeDashboard, routeLookUp ]} showDescription={true}/>
        </main>
        </>
    );
}
