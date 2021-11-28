import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'

export interface AppNsStackArgs {
  appStagingNamespaceName: string,
  appProdNamespaceName: string,
}

export class AppNsStack extends pulumi.ComponentResource {
  constructor(name: string, args: AppNsStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:AppNsStack', name, {}, opts)

    const {
      appStagingNamespaceName,
      appProdNamespaceName,
    } = args

    const appStagingNamespace = new k8s.core.v1.Namespace(appStagingNamespaceName, {
      metadata: { name: appStagingNamespaceName }
    }, { parent: this })

    const appProdNamespace = new k8s.core.v1.Namespace(appProdNamespaceName, {
      metadata: { name: appProdNamespaceName }
    }, { parent: this })

    this.registerOutputs()
  }
}