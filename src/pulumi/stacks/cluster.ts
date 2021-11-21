import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'
import * as eks from '@pulumi/eks'
import * as aws from '@pulumi/aws'

export interface ClusterScalingConfig {
  desiredSize: number,
  minSize: number,
  maxSize: number,
}

export interface ClusterStackArgs {
  project: string,
  diskSize: number,
  scalingConfig: ClusterScalingConfig,
}

export class ClusterStack extends pulumi.ComponentResource {
  vpcPublicSubnetIds: Promise<pulumi.Output<string>[]>
  kubeconfig: pulumi.Output<any>
  clusterName: string
  clusterOidcProviderId: pulumi.Output<string> | undefined
  clusterOidcProviderArn: pulumi.Output<string> | undefined
  sgRdsId: pulumi.Output<string>

  constructor(name: string, args: ClusterStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:ClusterStack', name, {}, opts)

    const { project } = args

    // IAM role for eks managed node group
    const instanceAssumeRolePolicy = aws.iam.getPolicyDocument({
      statements: [{
        actions: ['sts:AssumeRole'],
        principals: [{
          type: 'Service',
          identifiers: ['ec2.amazonaws.com'],
        }],
      }],
    })
    const nodeGroupRole = new aws.iam.Role('ng-role', {
      assumeRolePolicy: instanceAssumeRolePolicy.then(rolePolicy => rolePolicy.json),
    })
    const policyArns = [
      'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
      'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
      'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly',
    ]
    policyArns.forEach((policyArn, i) => {
      new aws.iam.RolePolicyAttachment(`ng-role-policy-${i}`, { policyArn, role: nodeGroupRole })
    })

    /**
     * VPC
     */
    const vpc = new awsx.ec2.Vpc('vpc', {})

    /**
     * EKS cluster
     */
    const clusterName = `${project}-cluster`
    const cluster = new eks.Cluster(clusterName, {
      name: clusterName,
      skipDefaultNodeGroup: true,
      vpcId: vpc.id,
      publicSubnetIds: vpc.publicSubnetIds,
      privateSubnetIds: vpc.privateSubnetIds,
      // gpu: true,
      createOidcProvider: true, // creates OIDC Provider to enable IAM Roles for Service Accounts (IRSA) in EKS - required for cert-manager setup
      instanceRoles: [nodeGroupRole],
    }, {})
    const kubeconfig = cluster.kubeconfig
    const clusterOidcProviderId = cluster.core.oidcProvider?.id
    const clusterOidcProviderArn = cluster.core.oidcProvider?.arn

    /**
     * VPC Security Group for RDS
     */
    const sgRds = new awsx.ec2.SecurityGroup('custom-rds', { vpc })
    awsx.ec2.SecurityGroupRule.ingress('postgres-access', sgRds,
      new awsx.ec2.AnyIPv4Location(),
      new awsx.ec2.TcpPorts(5432),
      'allow all postgres access'
    )
    awsx.ec2.SecurityGroupRule.ingress('ssh-access', sgRds,
      new awsx.ec2.AnyIPv4Location(),
      new awsx.ec2.TcpPorts(22),
      'allow ssh access'
    )

    /**
     * EKS managed node group
     */
    const defaultNodeGroupName = 'aws-managed-ng-default'
    const defaultNodeGroup = new eks.ManagedNodeGroup(defaultNodeGroupName, {
      cluster: {
        ...cluster.core,
        nodeGroupOptions: {
          autoScalingGroupTags: {
            // Required for Cluster Autoscaler to work with eks
            [`k8s.io/cluster-autoscaler/${clusterName}`]: 'owned',
            'k8s.io/cluster-autoscaler/enabled': 'TRUE',
          },
        }
      },
      capacityType: 'ON_DEMAND',
      instanceTypes: ['t3.medium'],
      nodeGroupName: defaultNodeGroupName,
      nodeRole: nodeGroupRole,
      diskSize: 30,
      scalingConfig: {
        desiredSize: 3,
        minSize: 3,
        maxSize: 20,
      },
    }, { // DO NOT specify k8sProvider here - it'll error out
      dependsOn: [cluster],
      ignoreChanges: ['scalingConfig.desiredSize'], // required for Cluster Autoscaler setup
    })

    this.vpcPublicSubnetIds = vpc.publicSubnetIds
    this.kubeconfig = kubeconfig
    this.clusterName = clusterName
    this.clusterOidcProviderId = clusterOidcProviderId
    this.clusterOidcProviderArn = clusterOidcProviderArn
    this.sgRdsId = sgRds.id

    this.registerOutputs()
  }
}