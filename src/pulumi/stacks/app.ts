import * as path from 'path'
import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'
import * as knative from '../k8s_crds/knative-serving'
import { KnativeVirtualService } from '../component_resources'

require('dotenv').config({
  path: path.resolve(__dirname, '../../frontend', '.env')
})

export interface AppStackArgs {
  project: string,
  stackEnv: string,
  customDomain: string,
  appNamespaceName: string,
  dbSecretName: string,
  knativeHttpsIngressGatewayName: string,
}

export class AppStack extends pulumi.ComponentResource {
  constructor(name: string, args: AppStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:AppStack', name, {}, opts)

    const {
      project,
      stackEnv,
      customDomain,
      appNamespaceName,
      dbSecretName,
      knativeHttpsIngressGatewayName,
    } = args

    const projectRootDir = path.resolve(__dirname, '../../')
    const isProduction = stackEnv === 'prod'

    /**
     * Build and push images to ECR
     */

    // Unique to React Apps
    // Must provide frontend env variables (i.e. REACT_APP_*) since it's not present during Github Actions CD (i.e. .env is not checked into the repo)
    const frontendEnvs = {
    }
    const appImage = awsx.ecr.buildAndPushImage(`${project}-${stackEnv}-app-image`, {
      context: projectRootDir,
      dockerfile: './Dockerfile.prod',
      ...Object.keys(frontendEnvs).length === 0 ? {} : { args: frontendEnvs },
    })

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
              image: appImage.image(),
              env: [
                {
                  name: 'NODE_ENV',
                  value: isProduction ? 'production' : 'staging',
                },
                {
                  name: 'DATABASE_URL',
                  valueFrom: {
                    secretKeyRef: {
                      name: dbSecretName,
                      key: 'prisma_database_url'
                    }
                  }
                },
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