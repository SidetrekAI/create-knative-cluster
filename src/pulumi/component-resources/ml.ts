import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'

export class Jupyterhub extends pulumi.ComponentResource {
  constructor(name: string, args: any, opts?: pulumi.ComponentResourceOptions) {
    super('custom:ml:Jupyterhub', name, {}, opts)

    const jupyterhubNamespaceName = 'jupyterhub'
    const jupyterhubNamespace = new k8s.core.v1.Namespace(jupyterhubNamespaceName, {
      metadata: { name: jupyterhubNamespaceName }
    }, { parent: this })

    const jupyterhubReleaseName = 'jupyterhub'
    const jupyterhubRelease = new k8s.helm.v3.Release(jupyterhubReleaseName, {
      name: jupyterhubReleaseName,
      namespace: jupyterhubNamespace.metadata.name,
      chart: 'jupyterhub',
      repositoryOpts: {
        repo: 'https://jupyterhub.github.io/helm-chart/',
      },
      cleanupOnFail: true,
    }, { parent: this })

    

    this.registerOutputs()
  }
}
