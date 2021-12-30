import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'
import * as k8s from '@pulumi/kubernetes'
import { AppAutoscaleStep, AppBuildStep, AppDeployStep, K8sContainerEnvVar } from '../component-resources/app'

export interface AppStackArgs {
  imageName: string,
  imageContext: string,
  imageDockerfile: string,
  appSvcName: string,
  appNamespaceName: string,
  containerEnvs?: K8sContainerEnvVar[],
}

export class AppStack extends pulumi.ComponentResource {
  constructor(name: string, args: AppStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:AppStack', name, {}, opts)

    const {
      imageName,
      imageContext,
      imageDockerfile,
      appSvcName,
      appNamespaceName,
      containerEnvs,
    } = args

    // Build app - name is used as ECR repo name
    const { imageUrl } = new AppBuildStep(imageName, {
      context: imageContext,
      dockerfile: imageDockerfile,
    }, { parent: this })

    // Deploy app svc
    const appDeployStep = new AppDeployStep(appSvcName, {
      namespace: appNamespaceName,
      svcName: appSvcName,
      image: imageUrl,
      containerPort: 4000, // GOTCHA: containerPort must match the port of the server running in the container
      ...containerEnvs ? { containerEnvs } : {},
    }, { parent: this })

    const appAutoscaleStep = new AppAutoscaleStep(appSvcName, {
      targetDeploymentName: appSvcName,
      targetDeploymentNamespace: appNamespaceName,
    }, { parent: this })

    this.registerOutputs()
  }
}