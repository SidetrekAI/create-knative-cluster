import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'
import * as eks from '@pulumi/eks'
import * as aws from '@pulumi/aws'

export interface ClusterStackArgs {
  project: string,
}

export class ClusterStack extends pulumi.ComponentResource {
  vpc: awsx.ec2.Vpc
  vpcId: pulumi.Output<string>
  vpcPublicSubnetIds: Promise<pulumi.Output<string>[]>
  kubeconfig: pulumi.Output<any>
  clusterName: string
  clusterEndpoint: pulumi.Output<any>
  clusterOidcProviderId: pulumi.Output<string>
  clusterOidcProviderUrl: pulumi.Output<string>
  clusterOidcProviderArn: pulumi.Output<string>
  eksHash: pulumi.Output<string>
  nodeGroupRole: aws.iam.Role

  constructor(name: string, args: ClusterStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:ClusterStack', name, {}, opts)

    const { project } = args
    const clusterName = `${project}-cluster`

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
    const nodeGroupRole = new aws.iam.Role(`NgRole-${clusterName}`, {
      assumeRolePolicy: instanceAssumeRolePolicy.then(rolePolicy => rolePolicy.json),
    })
    const policyArns = [
      'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
      'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
      'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly',
      'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore', // required for Karpenter
    ]
    policyArns.forEach((policyArn, i) => {
      new aws.iam.RolePolicyAttachment(`ng-role-policy-${i}`, { policyArn, role: nodeGroupRole })
    })

    /**
     * VPC
     */
    const vpc = new awsx.ec2.Vpc('vpc', {
      numberOfAvailabilityZones: 3,
      subnets: [
        { type: "public" },
        { type: "private", tags: { [`kubernetes.io/cluster/${clusterName}`]: 'owned' } }, // tags required for Karpenter setup
      ]
    })

    /**
     * EKS cluster
     */
    const cluster = new eks.Cluster(clusterName, {
      name: clusterName,
      skipDefaultNodeGroup: true,
      vpcId: vpc.id,
      publicSubnetIds: vpc.publicSubnetIds,
      privateSubnetIds: vpc.privateSubnetIds,
      // gpu: true,
      createOidcProvider: true, // creates OIDC Provider to enable IAM Roles for Service Accounts (IRSA) in EKS
      instanceRoles: [nodeGroupRole],
    }, {})
    const kubeconfig = cluster.kubeconfig
    const clusterOidcProvider = cluster.core.oidcProvider as any
    const clusterEndpoint = cluster.core.endpoint

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
        desiredSize: 4,
        minSize: 4,
        maxSize: 20,
      },
    }, { // DO NOT specify k8sProvider here - it'll error out
      dependsOn: [cluster],
      ignoreChanges: ['scalingConfig.desiredSize'], // required for Cluster Autoscaler setup
    })

    this.vpc = vpc
    this.vpcId = vpc.id
    this.vpcPublicSubnetIds = vpc.publicSubnetIds
    this.kubeconfig = kubeconfig
    this.clusterName = clusterName
    this.clusterEndpoint = clusterEndpoint
    this.clusterOidcProviderId = clusterOidcProvider.id
    this.clusterOidcProviderUrl = clusterOidcProvider.url
    this.clusterOidcProviderArn = clusterOidcProvider.arn
    this.eksHash = clusterOidcProvider.id.apply((oidcProviderId: string) => oidcProviderId.split('/').slice(-1)[0])
    this.nodeGroupRole = nodeGroupRole

    this.registerOutputs()
  }
}