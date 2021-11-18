import { KnativeEventing } from '../custom_resources'
import { getK8sProvider } from '../helpers'

const createPulumiProgram = (inputs?: any) => async () => {
  const [
    { clusterName, kubeconfig },
  ] = inputs

  const k8sProvider = getK8sProvider(clusterName, kubeconfig)

  const knativeEventing = new KnativeEventing('knative-eventing', {}, { provider: k8sProvider })

  return {}
}

export default {
  createPulumiProgram,
}