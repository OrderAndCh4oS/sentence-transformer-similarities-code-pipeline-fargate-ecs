import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from "aws-cdk-lib/aws-logs";
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";
import * as path from "path";

export class EcsCodeDeployExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubUserName = new cdk.CfnParameter(this, "githubUserName", {
      type: "String",
      description: "Github username for source code repository"
    })

    const githubRepository = new cdk.CfnParameter(this, "githubRepository", {
      type: "String",
      description: "Github source code repository",
      default: "similarity-embeddings-code-pipeline-fargate-ecs"
    })

    const githubPersonalTokenSecretName = new cdk.CfnParameter(this, "githubPersonalToken", {
      type: "String",
      description: "The name of the AWS Secrets Manager Secret which holds the GitHub Personal Access Token for this project.",
      default: "github/personal_access_token"
    })

    const ecrRepo = new ecr.Repository(this, `${this.stackName}EcrRepo`);

    const vpc = new ec2.Vpc(this, "SimilarityEmbeddingsVpc", {
      natGateways: 1,
      subnetConfiguration: [
        {cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC, name: "Public"},
        {cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, name: "Private"}
      ],
      maxAzs: 3
    });

    const cluster = new ecs.Cluster(this, 'SimilarityEmbeddingsCluster', {
      vpc,
      containerInsights: true
    });

    const image = ecs.ContainerImage.fromAsset(
        path.join(__dirname, '../src'),
        {
          platform: ecrAssets.Platform.LINUX_AMD64,
        }
    );

    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'SimilarityEmbeddingsAlbFargate', {
      cluster,
      taskImageOptions: {
        image,
        containerPort: 80,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: id,
          logRetention: logs.RetentionDays.ONE_MONTH,
        }),
      },
      assignPublicIp: true,
      memoryLimitMiB: 512,
      cpu: 256,
      desiredCount: 1,
      deploymentController: {type: ecs.DeploymentControllerType.ECS},
    });

    const gitHubSource = codebuild.Source.gitHub({
      owner: githubUserName.valueAsString,
      repo: githubRepository.valueAsString,
      webhook: true,
      webhookFilters: [
        codebuild.FilterGroup
            .inEventOf(codebuild.EventAction.PUSH)
            .andBranchIs('main'),
      ],
    });

    const project = new codebuild.Project(this, `${this.stackName}CodeBuild`, {
      projectName: `${this.stackName}`,
      source: gitHubSource,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,
        privileged: true
      },
      environmentVariables: {
        'cluster_name': {
          value: `${cluster.clusterName}`
        },
        'ecr_repo_uri': {
          value: `${ecrRepo.repositoryUri}`
        }
      },
      badge: true,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          pre_build: {
            /*
            commands: [
              'env',
              'export tag=${CODEBUILD_RESOLVED_SOURCE_VERSION}'
            ]
            */
            commands: [
              'env',
              'export tag=latest'
            ]
          },
          build: {
            commands: [
              'cd src',
              `docker build -t $ecr_repo_uri:$tag .`,
              '$(aws ecr get-login --no-include-email)',
              'docker push $ecr_repo_uri:$tag'
            ]
          },
          post_build: {
            commands: [
              'echo "in post-build stage"',
              'cd ..',
              "printf '[{\"name\":\"similarity-embedding-app\",\"imageUri\":\"%s\"}]' $ecr_repo_uri:$tag > imagedefinitions.json",
              "pwd; ls -al; cat imagedefinitions.json"
            ]
          }
        },
        artifacts: {
          files: [
            'imagedefinitions.json'
          ]
        }
      })
    });

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();
    const nameOfGithubPersonTokenParameterAsString = githubPersonalTokenSecretName.valueAsString
    const sourceAction = new codepipelineActions.GitHubSourceAction({
      actionName: 'github_source',
      owner: githubUserName.valueAsString,
      repo: githubRepository.valueAsString,
      branch: 'main',
      oauthToken: cdk.SecretValue.secretsManager(nameOfGithubPersonTokenParameterAsString),
      output: sourceOutput
    });

    const buildAction = new codepipelineActions.CodeBuildAction({
      actionName: 'codebuild',
      project: project,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const manualApprovalAction = new codepipelineActions.ManualApprovalAction({
      actionName: 'approve',
    });

    const deployAction = new codepipelineActions.EcsDeployAction({
      actionName: 'deployAction',
      service: fargateService.service,
      imageFile: new codepipeline.ArtifactPath(buildOutput, `imagedefinitions.json`)
    });

    new codepipeline.Pipeline(this, `${this.stackName}CodePipeline`, {
      pipelineName: `${this.stackName}CodePipeline`,
      stages: [
        {
          stageName: 'source',
          actions: [sourceAction],
        },
        {
          stageName: 'build',
          actions: [buildAction],
        },
        {
          stageName: 'approve',
          actions: [manualApprovalAction],
        },
        {
          stageName: 'deploy-to-ecs',
          actions: [deployAction],
        }
      ]
    });

    ecrRepo.grantPullPush(project.role!);
    project.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "ecs:describecluster",
        "ecr:getauthorizationtoken",
        "ecr:batchchecklayeravailability",
        "ecr:batchgetimage",
        "ecr:getdownloadurlforlayer"
      ],
      resources: [`${cluster.clusterArn}`],
    }));

    new cdk.CfnOutput(this, `${this.stackName}Image`, { value: ecrRepo.repositoryUri+":latest"} )
    new cdk.CfnOutput(this, `${this.stackName}LoadBalancerDns`, { value: fargateService.loadBalancer.loadBalancerDnsName });
  }
}
