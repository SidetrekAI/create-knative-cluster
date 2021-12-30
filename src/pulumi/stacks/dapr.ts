import * as pulumi from '@pulumi/pulumi'
import { Dapr } from '../component-resources/cluster-svc'

export class DaprStack extends pulumi.ComponentResource {
  constructor(name: string, args: any, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:DaprStack', name, {}, opts)

    const dapr = new Dapr(`dapr`, {}, { parent: this })

    this.registerOutputs()
  }
}