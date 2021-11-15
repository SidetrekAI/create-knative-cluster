import { ClusterAutoscaler } from '../custom_resources'

const createPulumiProgram = (inputs?: any) => async () => {
  const {
    cluster: {
      
    },
  } = inputs

  const clusterAutoscaler = new ClusterAutoscaler('cluster-autoscaler', {
    awsAccountId,
    awsRegion,
    clusterName,
    eksHash,
  }, { parent: this })

  return {}
}

export default {
  createPulumiProgram,
}