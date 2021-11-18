import { KnativeServing } from '../custom_resources'
import { getK8sProvider } from '../helpers'

const createPulumiProgram = (inputs?: any) => async () => {
  const [
    { clusterName, kubeconfig },
    { customDomain, knativeHttpsIngressGatewayName },
  ] = inputs

  const k8sProvider = getK8sProvider(clusterName, kubeconfig)

  const knativeServing = new KnativeServing('knative-serving', {
    customDomain,
    knativeHttpsIngressGatewayName,
  }, { provider: k8sProvider })

  return {}
}

export default {
  createPulumiProgram,
}