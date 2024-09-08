import { AttributeType, Table, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket } from 'aws-cdk-lib/aws-s3';



export class RekognitionDatabaseStack extends Stack {
    jobTable: Table;
    s3Bucket: Bucket;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.jobTable = new Table(this, 'RekognitionJobTable', {
            partitionKey: { name: 'job_id', type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        this.jobTable.addGlobalSecondaryIndex({
            indexName: 'gsi-userid',
            partitionKey: { name: 'user_id', type: AttributeType.STRING },
            sortKey: { name: 'request_timestamp', type: AttributeType.NUMBER },
        });

        this.s3Bucket = new Bucket(this, 'RekognitionBucket', {
            removalPolicy: RemovalPolicy.RETAIN
        })

    }
}