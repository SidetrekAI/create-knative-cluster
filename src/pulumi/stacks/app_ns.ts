import * as k8s from '@pulumi/kubernetes'
import { getK8sProvider } from '../helpers'

const createPulumiProgram = (inputs: any[]) => async () => {
  const [
    { clusterName, kubeconfig },
    { appStagingNamespaceName, appProdNamespaceName },
  ] = inputs
  
  const k8sProvider = getK8sProvider(clusterName.value, kubeconfig.value)
  
  const appStagingNamespace = new k8s.core.v1.Namespace(appStagingNamespaceName, {
    metadata: { name: appStagingNamespaceName }
  }, { provider: k8sProvider })

  const appProdNamespace = new k8s.core.v1.Namespace(appProdNamespaceName, {
    metadata: { name: appProdNamespaceName }
  }, { provider: k8sProvider })

  return {
    appStagingNamespace: {
      id: appStagingNamespace.id,
      name: appStagingNamespace.metadata.name,
    },
    appProdNamespaceName: {
      id: appProdNamespace.id,
      name: appProdNamespace.metadata.name,
    }
  }
}

export default {
  createPulumiProgram,
}