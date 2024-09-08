# Serverless Backend for Human Traffic Analysis
## + NextJs Demo App

## Overview
- Backend: Rust + Amazon Rekognition ([people pathing](https://docs.aws.amazon.com/rekognition/latest/dg/persons.html))
![](/readme-assets/cloud-formation.jpg)

- Frontend: Next.js (Deployed on App Runner)
![](/readme-assets/nextjs-top.png)

## Set Up
1. Download the repository
2. Set Up AWS CDK as described [here](https://docs.aws.amazon.com/cdk/v2/guide/prerequisites.html)
3. Start Docker daemon
4. Run the following command
```
cd cdk
cdk deploy --all
```
This will create all the resource mentioned above.
- Dynamo Table for jobs (analysis requests)
    - primary key: `job_id`
    - GSI: `user_id`
- S3 Bucket for saving videos and analysis results
    - each job has its own folder: reference saved in Dynamo
- API Gateway + Lambda Proxy with access to Dynamo, S3, and rekognition
- SNS Topic
- Rekognition IAM role for accessing SNS
- Process-results-lambda with SNS subscription for retreiving analysis results after finish, saving the results to S3, and updating Dynamo entry.
- Next.js Demo app deployed on App Runner

I have a Dockerfile included for the Next.js App so you can  deploy it anywhere you like. However, If you are NOT using the CDK Stack I provide for deploying the Next.js App, make sure you set up the environment variable `API_ENDPOINT` with your API Gateway URL.


## API Endpoints Available
### Endpoints for starting a Tracking Analysis
- GET `/upload_url`: get a presigned S3 upload URL.
- POST `/start_analysis`: start a rekognition path tracking analysis job. Before calling this endpoint, make sure that you have `PUT` the video data directly to S3 using the presigned S3 upload URL obtained above.


### Endpoints for Retrieving a tracking analysis (job)
- GET `/:job_id`: get the job summary including job status, a tracking summary if analysis finished, and video metadata.
- GET `/:job_id/video_url`: get a presigned S3 video URL for playing the video.
- GET `/:job_id/results_url`: get a presigned S3 URL for downlaoding the tracking resuls (JSON).

### Endpoint for deleting a job
- DELETE `/:job_id`: delete a job, including S3 objects and Dynamo entry.

### Endpoint for getting all jobs for a user
- GET `/:user_id/jobs`: get all jobs for a given user in descending request time. If more jobs are available, a `LastEvaluatedKey` will also be return and is intended to be used when making the next request.


*For more details about the parameters required by each endpoints, check out [`handlers`](/lambdas/api-gateway-lambda/src/handlers.rs).*

To find out how to use each endpoints and the general flow, refer to the frontend Next.js app.


## FrontEnd Features
- Upload a video, start a human traffic analysis, and obtaining a Job Id for later retrievement
![](/readme-assets/nextjs-new.png)
- Look up a job by Job Id
![](/readme-assets/nextjs-lookup.png)
- List of jobs submitted by the current user
![](/readme-assets/nextjs-dashboard.png)
- Visualize results with bounding boxes
![](/readme-assets/nextjs-results.png)
    - See how many people are tracked within a range of specification
    - Average tracking time within a range of specification




## Possible Variations/Improvements
- **User Login**: In the demo app, all I am doing is to save a random UUID in local storage. You could eventually implmenet some login features to allow user share session between mutliple browsers and etc.
- **Real time notification**: Since the Job takes a while to complete, instead of having our user come back and check regularly, we could send user a notification email when job finish. To do so, all we have to do is to call [Amazon Simple Email Service](https://aws.amazon.com/ses/) within the Process-Results-Lambda (the one on the right).



---
Please refer to [my Medium Blog](https://medium.com/@itsuki.enjoy/rust-rekognition-serverless-backend-for-human-traffic-analysis-2e1310cbad78) for more details and a quick comparision to [Swift Vision Framework](https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://developer.apple.com/documentation/vision/&ved=2ahUKEwj4p9qihrOIAxX3bvUHHXdfKm8QFnoECBsQAQ&usg=AOvVaw30xXlsk9_ElZxa0oyZIc9K).
