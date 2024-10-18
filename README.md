# Sentence Transformer Embeddings with AWS CDK, ECS Fargate, and CodePipeline

This repository provides an end-to-end solution for deploying a FastAPI application that generates sentence embeddings using [SentenceTransformers](https://www.sbert.net/). The infrastructure is defined using AWS CDK and includes:

- **AWS ECS Fargate**: For running the containerized FastAPI application.
- **AWS CodePipeline & CodeBuild**: For continuous integration and deployment.
- **AWS ECR**: For storing Docker images.
- **AWS VPC and Networking Components**: For secure and scalable networking.

## Architecture Overview

1. **FastAPI Application**: A simple API that accepts text inputs and returns their embeddings using a pre-trained SentenceTransformer model.
2. **Docker Container**: The application is containerized using Docker.
3. **AWS ECR (Elastic Container Registry)**: Stores the Docker images.
4. **AWS ECS Fargate**: Runs the Docker container in a serverless compute environment.
5. **AWS CodePipeline & CodeBuild**: Automates the build, test, and deployment of the application.
6. **AWS CDK (Cloud Development Kit)**: Infrastructure is defined as code using TypeScript.

## Prerequisites

- **AWS Account**: An active AWS account with permissions to create the resources.
- **AWS CLI**: Installed and configured with your AWS credentials.
- **Node.js**: Version 14 or later.
- **AWS CDK**: Installed globally (`npm install -g aws-cdk`).
- **Docker**: Installed and running.
- **GitHub Account**: For hosting the source code and integrating with CodePipeline.
- **GitHub Personal Access Token**: Required for CodePipeline to access the repository.

## Setup Instructions

### 1. Clone the Repository

```bash
git clone git@github.com:OrderAndCh4oS/sentence-transformer-similarities-code-pipeline-fargate-ecs.git
cd sentence-transformer-similarities-code-pipeline-fargate-ecs
```

### 2. Install Dependencies

Navigate to the CDK project directory and install the necessary packages.

```bash
cd sentence-transformer-similarities-code-pipeline-fargate-ecs
npm install
```


### 3. Set Up GitHub Personal Access Token

- Generate a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` and `admin:repo_hook` permissions.
- Store the token in AWS Secrets Manager:

  ```bash
  aws secretsmanager create-secret \
    --name github/personal_access_token \
    --secret-string "<your-personal-access-token>"
  ```

### 4. Deploy the CDK Stack

Update the `cdk.json` file with your GitHub username and repository name if necessary.

Deploy the stack:

```bash
cdk deploy --parameters githubUserName=<your-github-username>
```

## Project Structure


- **lib/ecs-code-deploy-example-stack.ts**: CDK stack defining AWS resources.
- **src/app/main.py**: FastAPI application code.
- **src/app/save_sentence_transformer_model.py**: Script to download and save the model.
- **src/Dockerfile**: Dockerfile for building the application image.

## Customization

### Changing the SentenceTransformer Model

By default, the `msmarco-MiniLM-L12-cos-v5` model is used. To change the model:

1. Update `save_sentence_transformer_model.py`:

   ```python
   model_name = "your-model-name"
   model = SentenceTransformer('sentence-transformers/your-model-name')
   model.save(f"/src/app/{model_name}")
   ```

2. Update `main.py` to load the new model:

   ```python
   model_name = "your-model-name"
   model = SentenceTransformer(f'/src/app/{model_name}')
   ```

### Generate Embeddings

```bash
curl -X POST http://<load-balancer-dns-name>/embeddings/create \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Hello, world!", "Another sentence."]}'
```

## Cleanup

To avoid incurring charges, delete the AWS resources when they're no longer needed:

```bash
cdk destroy
```

Also, remove the ECR repository and any images:

```bash
aws ecr delete-repository --repository-name similarity-embeddings-repository --force
```
