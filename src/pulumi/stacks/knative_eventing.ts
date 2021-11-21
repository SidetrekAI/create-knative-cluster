import * as pulumi from '@pulumi/pulumi'
import { KnativeEventing } from '../component_resources'

export interface KnativeEventingStackArgs {
}

export class KnativeEventingStack extends pulumi.ComponentResource {
  constructor(name: string, args: KnativeEventingStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:KnativeEventingStack', name, {}, opts)

    const {} = args

    const knativeEventing = new KnativeEventing('knative-eventing', {}, { parent: this })

    this.registerOutputs()
  }
}