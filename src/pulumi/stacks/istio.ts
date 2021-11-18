import { Istio } from '../custom_resources'
import { getK8sProvider } from '../helpers'

const createPulumiProgram = (inputs?: any) => async () => {
  const [
    { clusterName, kubeconfig },
  ] = inputs

  const k8sProvider = getK8sProvider(clusterName.value, kubeconfig.value)

  const istio = new Istio('knative-istio', {}, { provider: k8sProvider })

  return {}
}

export default {
  createPulumiProgram,
}