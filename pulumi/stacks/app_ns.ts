import * as k8s from '@pulumi/kubernetes'

const createPulumiProgram = (inputs?: any) => async () => {
  const appStagingNamespaceName = 'staging'
  const appStagingNamespace = new k8s.core.v1.Namespace(appStagingNamespaceName, {
    metadata: { name: appStagingNamespaceName }
  }, { parent: this })

  const appProdNamespaceName = 'prod'
  const appProdNamespace = new k8s.core.v1.Namespace(appProdNamespaceName, {
    metadata: { name: appProdNamespaceName }
  }, { parent: this })

  return {
    appStagingNamespaceName,
    appProdNamespaceName,
  }
}

export default {
  createPulumiProgram,
}