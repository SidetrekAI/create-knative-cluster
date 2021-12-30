import * as pulumi from '@pulumi/pulumi'
import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx"
import * as eks from "@pulumi/eks"
import * as k8s from "@pulumi/kubernetes"

interface IdentityStackArgs {
  awsAccountId: string,
}

export class IdentityStack extends pulumi.ComponentResource {
  clusterAdminRole: aws.iam.Role
  // automationRole: aws.iam.Role
  developerRole: aws.iam.Role

  constructor(name: string, args: IdentityStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:IdentityStack', name, {}, opts)

    const { awsAccountId } = args

    // Create IAM Roles and corresponding Kubernetes RBAC
    function createIAMRole(roleName: string): aws.iam.Role {
      return new aws.iam.Role(`${roleName}`, {
        assumeRolePolicy: `{
          "Version": "2012-10-17",
          "Statement":[
            {
              "Sid": "",
              "Effect": "Allow",
              "Principal": {
                "AWS": "arn:aws:iam::${awsAccountId}:root"
              },
              "Action": "sts:AssumeRole"
            }
          ]
        }`,
        tags: {
          clusterAccess: `${roleName}-user`,
        },
      })
    }

    // Administrator AWS IAM clusterAdminRole with full access to all AWS resources
    this.clusterAdminRole = createIAMRole('ClusterAdminRole')

    // // Administer Automation role for use in pipelines, e.g. gitlab CI, Teamcity, etc.
    // this.automationRole = createIAMRole('AutomationRole')

    // Administer Prod role for use in Prod environment
    this.developerRole = createIAMRole('DeveloperRole')

    this.registerOutputs()
  }
}