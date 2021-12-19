import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'
import * as k8s from '@pulumi/kubernetes'
import { RdsPostgres } from '../component-resources'

export interface DbStackArgs {
  dbUser: string,
  dbPassword: pulumi.Output<string>,
  stackEnv: string,
  appNamespaceName: string,
  vpc: awsx.ec2.Vpc,
  vpcPublicSubnetIds: pulumi.Output<any>,
}

export class DbStack extends pulumi.ComponentResource {
  rdsName: pulumi.Output<string>
  rdsEndpoint: pulumi.Output<string>
  rdsPort: pulumi.Output<number>

  constructor(name: string, args: DbStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:DbStack', name, {}, opts)

    const {
      dbUser,
      dbPassword,
      stackEnv,
      vpc,
      vpcPublicSubnetIds,
    } = args

    const isProd = stackEnv === 'prod'
    const postgresPort = 5432

    /**
     * VPC Security Group for RDS
     */
    const sgRds = new awsx.ec2.SecurityGroup('custom-rds', { vpc })
    awsx.ec2.SecurityGroupRule.ingress('postgres-access', sgRds,
      new awsx.ec2.AnyIPv4Location(),
      new awsx.ec2.TcpPorts(postgresPort),
      'allow all postgres access'
    )
    awsx.ec2.SecurityGroupRule.ingress('ssh-access', sgRds,
      new awsx.ec2.AnyIPv4Location(),
      new awsx.ec2.TcpPorts(22),
      'allow ssh access'
    )

    /**
     * Set up RDS
     */
    const rdsPostgresName = `${stackEnv}rdspostgres` // only lowercase alphaneumeric characters
    const rdsPostgres = new RdsPostgres(rdsPostgresName, {
      subnetIds: vpcPublicSubnetIds, // TODO: less secure
      // subnetIds: vpc.privateSubnetIds, // so it's NOT accessible from outside the VPC
      vpcSecurityGroupIds: [sgRds.id], // so it's accessible from another instance inside the cluster
      username: dbUser,
      password: dbPassword,
      instanceClass: isProd ? 'db.t3.small' : 'db.t3.micro',
      allocatedStorage: isProd ? 50 : 5,
      maxAllocatedStorage: isProd ? 1000 : 20,
    }, {})

    this.rdsName = rdsPostgres.name
    this.rdsEndpoint = rdsPostgres.endpoint
    this.rdsPort = rdsPostgres.port

    this.registerOutputs()
  }
}