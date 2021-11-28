import * as pulumi from '@pulumi/pulumi'
import { ClusterAutoscaler } from '../component-resources'

export interface ClusterAutoscalerStackArgs {
  awsAccountId: string,
  awsRegion: string,
  clusterName: pulumi.Output<string>,
  eksHash: pulumi.Output<string>,
}

export class ClusterAutoscalerStack extends pulumi.ComponentResource {
  constructor(name: string, args: ClusterAutoscalerStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:ClusterAutoscalerStack', name, {}, opts)

    const {
      awsAccountId,
      awsRegion,
      clusterName,
      eksHash,
    } = args

    const clusterAutoscaler = new ClusterAutoscaler('cluster-autoscaler', {
      awsAccountId,
      awsRegion,
      clusterName,
      eksHash,
    }, { parent: this })

    this.registerOutputs()
  }
}