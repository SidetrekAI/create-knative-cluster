import * as pulumi from '@pulumi/pulumi'
import { KnativeOperator } from '../component_resources'

export interface KnativeOperatorStackArgs {
  knativeServingVersion: string,
}

export class KnativeOperatorStack extends pulumi.ComponentResource {
  constructor(name: string, args: KnativeOperatorStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:KnativeOperatorStack', name, {}, opts)

    const { knativeServingVersion } = args

    const knativeOperator = new KnativeOperator('knative-operator', {
      version: knativeServingVersion,
    }, { parent: this })

    this.registerOutputs()
  }
}