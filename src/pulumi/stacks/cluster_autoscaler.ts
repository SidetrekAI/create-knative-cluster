import * as aws from '@pulumi/aws'
import { ClusterAutoscaler } from '../custom_resources'
import { getK8sProvider } from '../helpers'

const createPulumiProgram = (inputs: any[]) => async () => {
  const [{ clusterName, kubeconfig, eksHash }] = inputs

  const k8sProvider = getK8sProvider(clusterName.value, kubeconfig.value)
  const awsAccountId = await aws.getCallerIdentity({}).then(current => current.accountId)
  const awsRegion = await aws.getRegion().then(current => current.name)

  const clusterAutoscaler = new ClusterAutoscaler('cluster-autoscaler', {
    awsAccountId,
    awsRegion,
    clusterName: clusterName.value,
    eksHash: eksHash.value,
  }, { provider: k8sProvider })

  return {}
}

export default {
  createPulumiProgram,
}