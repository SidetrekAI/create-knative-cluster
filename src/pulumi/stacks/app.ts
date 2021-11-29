import * as path from 'path'
import * as dotenv from 'dotenv'
import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'
import * as knative from '../k8s-crds/knative-serving'
import { KnativeVirtualService } from '../component-resources'

dotenv.config({ path: path.resolve(__dirname, '../../frontend', '.env') })

export interface AppStackArgs {
  project: string,
  stackEnv: string,
  imageUrl: pulumi.Output<string> | string,
  customDomain: string,
  appNamespaceName: string,
  dbUser?: string,
  dbPassword?: pulumi.Output<string>,
  dbName?: pulumi.Output<string>,
  dbEndpoint?: pulumi.Output<string>,
  dbPort?: pulumi.Output<number>,
  knativeHttpsIngressGatewayName: string,
}

export class AppStack extends pulumi.ComponentResource {
  constructor(name: string, args: AppStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:AppStack', name, {}, opts)

    const {
      project,
      stackEnv,
      imageUrl,
      customDomain,
      appNamespaceName,
      dbUser,
      dbPassword,
      dbName,
      dbEndpoint,
      dbPort,
      knativeHttpsIngressGatewayName,
    } = args

    const isProduction = stackEnv === 'prod'

    // Deploy Knative Service
    const appKSvcName = `app-ksvc`
    const appKSvc = new knative.serving.v1.Service(appKSvcName, {
      metadata: {
        namespace: appNamespaceName,
        name: appKSvcName,
        labels: {
          app: project,
          'networking.knative.dev/visibility': 'cluster-local' // make this service accessible only within the cluster
        },
      },
      spec: {
        template: {
          metadata: {
            annotations: {
              'autoscaling.knative.dev/initialScale': '1',
              'autoscaling.knative.dev/minScale': '1', // prevent scaledown to zero
            },
          },
          spec: {
            containers: [{
              image: imageUrl,
              env: [
                { name: 'NODE_ENV', value: isProduction ? 'production' : 'staging' },
                ...(dbUser ? [{ name: 'DB_USER', value: dbUser }] : []),
                ...(dbPassword ? [{ name: 'DB_PASSWORD', value: dbPassword }] : []),
                ...(dbName ? [{ name: 'DB_NAME', value: dbName }] : []),
                ...(dbEndpoint ? [{ name: 'DB_ENDPOINT', value: dbEndpoint }] : []),
                ...(dbPort ? [{ name: 'DB_PORT', value: dbPort }] : []),
                // {
                //   name: 'DATABASE_URL',
                //   value: pulumi.interpolate`postgresql://${dbUser}:${dbPassword}@${dbEndpoint}:${dbPort}/${dbName}?schema=public`
                // },
              ],
            }]
          }
        },
        traffic: [
          {
            latestRevision: true,
            percent: 100,
          },
          // {
          //   revisionName: 'app-ksvc-00004',
          //   percent: 100,
          // },
        ]
      },
    }, { parent: this })

    /**
     * Handle ingress gateway routing to services using Istio Virtual Service
     */
    const appKvsName = 'app-entry-route'
    const appKvs = new KnativeVirtualService(appKvsName, {
      useKnativeRouting: true,
      namespace: appNamespaceName,
      gateways: [`${knativeHttpsIngressGatewayName}.knative-serving.svc.cluster.local`],
      hosts: isProduction ? [`*.${customDomain}`] : [`${appNamespaceName}.${customDomain}`],
      routes: [
        {
          uri: '/',
          rewriteUri: '/',
          serviceHostname: `${appKSvcName}.${appNamespaceName}.svc.cluster.local`,
        },
      ]
    }, { parent: this })

    this.registerOutputs()
  }
}