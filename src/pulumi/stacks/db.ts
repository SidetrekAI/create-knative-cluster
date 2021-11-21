import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'
import { RdsPostgres } from '../component_resources'

export interface DbStackArgs {
  dbUser: string,
  dbPassword: pulumi.Output<string>,
  stackEnv: string,
  appNamespaceName: string,
  sgRdsId: string,
  vpcPublicSubnetIds: string[],
}

export class DbStack extends pulumi.ComponentResource {
  rdsEndpoint: pulumi.Output<string>
  dbSecretName: string

  constructor(name: string, args: DbStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:DbStack', name, {}, opts)

    const {
      dbUser,
      dbPassword,
      stackEnv,
      appNamespaceName,
      sgRdsId,
      vpcPublicSubnetIds,
    } = args

    const isProd = stackEnv === 'prod'

    /**
     * Set up RDS
     */
    const rdsPostgresName = `${stackEnv}rdspostgres` // only lowercase alphaneumeric characters
    const rdsPostgres = new RdsPostgres(rdsPostgresName, {
      subnetIds: vpcPublicSubnetIds, // TODO: less secure
      // subnetIds: vpc.privateSubnetIds, // so it's NOT accessible from outside the VPC
      vpcSecurityGroupIds: [sgRdsId], // so it's accessible from another instance inside the cluster
      username: dbUser,
      password: dbPassword,
      instanceClass: isProd ? 'db.t3.small' : 'db.t3.micro',
      allocatedStorage: isProd ? 10 : 5,
      maxAllocatedStorage: isProd ? 100 : 20,
    }, {})

    const dbSecretName = `${stackEnv}-db-secret`
    const dbSecret = new k8s.core.v1.Secret(dbSecretName, {
      metadata: {
        namespace: appNamespaceName,
        name: dbSecretName,
      },
      stringData: {
        prisma_database_url: pulumi.interpolate`postgresql://${dbUser}:${dbPassword}@${rdsPostgres.endpoint}/${rdsPostgres.name}?schema=public`
      }
    }, { parent: this, dependsOn: [rdsPostgres] })

    this.rdsEndpoint = rdsPostgres.endpoint
    this.dbSecretName = dbSecretName

    this.registerOutputs()
  }
}