#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RekognitionHandlerStack } from '../lib/handler-stack';
import { RekognitionDatabaseStack } from '../lib/database-stack';
import { FrontEndStack } from '../lib/frontend-stack';

const app = new cdk.App();
const dbStack = new RekognitionDatabaseStack(app, 'RekognitionDatabaseStack')
const handlerStack = new RekognitionHandlerStack(app, 'RekognitionHandlerStack', {
    jobTable: dbStack.jobTable,
    s3Bucket: dbStack.s3Bucket,
});
const frontEndStack = new FrontEndStack(app, 'RekognitionFrontendStack', {
    endpointUrl: handlerStack.restApi.url
})