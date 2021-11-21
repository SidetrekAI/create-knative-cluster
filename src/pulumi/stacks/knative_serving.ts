import * as pulumi from '@pulumi/pulumi'
import { KnativeServing } from '../component_resources'

export interface KnativeServingStackArgs {
  customDomain: string,
  knativeHttpsIngressGatewayName: string,
}

export class KnativeServingStack extends pulumi.ComponentResource {
  constructor(name: string, args: KnativeServingStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:KnativeServingStack', name, {}, opts)

    const {
      customDomain,
      knativeHttpsIngressGatewayName,
    } = args

    const knativeServing = new KnativeServing('knative-serving', {
      customDomain,
      knativeHttpsIngressGatewayName,
    }, { parent: this })

    this.registerOutputs()
  }
}