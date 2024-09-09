import { join } from 'path';
import { RustFunction } from 'cargo-lambda-cdk';
import { EndpointType, LambdaRestApi } from 'aws-cdk-lib/aws-apigateway'
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Duration, Size, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Subscription, SubscriptionProtocol, Topic } from 'aws-cdk-lib/aws-sns';
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';


export interface HandlerStackProps extends StackProps {
    jobTable: Table;
    s3Bucket: Bucket;
}

export class RekognitionHandlerStack extends Stack {
    restApi: LambdaRestApi

    constructor(scope: Construct, id: string, props: HandlerStackProps) {
        super(scope, id, props);

        const jobTable = props.jobTable;
        const s3Bucket = props.s3Bucket;

        // sns topic
        const snsTopic = new Topic(this, 'AmazonRekognitionTopic', {
            topicName: 'AmazonRekognitionTopic'
        })

        const rekognitionServiceRole = new Role(this, 'RekognitionServiceRole', {
            assumedBy: new ServicePrincipal('rekognition.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromManagedPolicyArn(this, 'AmazonRekognitionServiceRole', 'arn:aws:iam::aws:policy/service-role/AmazonRekognitionServiceRole')
            ],
        })

        // apigateway lambda
        const apigatewayLambda = new RustFunction(this, 'RekognitionAPIGatewayLambda', {
            // Path to the root directory.
            manifestPath: join(__dirname, '..', '..', 'lambdas/api-gateway-lambda/'),
            environment: {
                'TABLE_NAME': jobTable.tableName,
                "BUCKET_NAME": s3Bucket.bucketName,
                "TOPIC_ARN": snsTopic.topicArn,
                "ROLE_ARN": rekognitionServiceRole.roleArn
            },
            timeout: Duration.minutes(5),
            memorySize: 10000,
            ephemeralStorageSize: Size.gibibytes(1)
        });

        const restApi = new LambdaRestApi(this, 'RekognitionAPIGateway', {
            handler: apigatewayLambda,
            endpointTypes: [EndpointType.REGIONAL],
        });
        this.restApi = restApi

        s3Bucket.grantReadWrite(apigatewayLambda);
        jobTable.grantFullAccess(apigatewayLambda);
        apigatewayLambda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'rekognition:*'
            ],
            resources: ['*'],
        }))

        // https://docs.aws.amazon.com/rekognition/latest/dg/stored-video-lambda.html
        // To call Amazon Rekognition Video Start operations, such as StartLabelDetection,
        // also require pass role permissions for the IAM service role that Amazon Rekognition Video uses to access the Amazon SNS topic.
        apigatewayLambda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'iam:PassRole'
            ],
            resources: [rekognitionServiceRole.roleArn],
        }))

        const processResultsLambda = new RustFunction(this, 'RekognitionProcessResultLambda', {
            // Path to the root directory.
            manifestPath: join(__dirname, '..', '..', 'lambdas/process-results-lambda/'),
            environment: {
                "TOPIC_ARN": snsTopic.topicArn,
                'TABLE_NAME': jobTable.tableName,
            },
            timeout: Duration.minutes(5),
            memorySize: 1000,
            ephemeralStorageSize: Size.gibibytes(1)
        });

        s3Bucket.grantReadWrite(processResultsLambda);
        jobTable.grantFullAccess(processResultsLambda);

        processResultsLambda.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'rekognition:*'
            ],
            resources: ['*'],
        }))

        const snsSubscription = new Subscription(this, 'Subscription', {
            topic: snsTopic,
            endpoint: processResultsLambda.functionArn,
            protocol: SubscriptionProtocol.LAMBDA,
        });

        processResultsLambda.addPermission('RekognitionTopicInvokePermission', {
            principal: new ServicePrincipal('sns.amazonaws.com'),
            sourceArn: snsTopic.topicArn,
            action: 'lambda:InvokeFunction',
        })

    }
}