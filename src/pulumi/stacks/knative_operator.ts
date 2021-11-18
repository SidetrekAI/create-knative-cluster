import { KnativeOperator } from '../custom_resources'
import { getK8sProvider } from '../helpers'

const createPulumiProgram = (inputs?: any) => async () => {
  const [
    { clusterName, kubeconfig },
    { knativeOperatorVersion },
  ] = inputs

  const k8sProvider = getK8sProvider(clusterName.value, kubeconfig.value)

  const knativeOperator = new KnativeOperator('knative-operator', {
    version: knativeOperatorVersion,
  }, { provider: k8sProvider })

  return {}
}

export default {
  createPulumiProgram,
}