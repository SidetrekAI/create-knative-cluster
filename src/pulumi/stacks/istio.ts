import * as pulumi from '@pulumi/pulumi'
import { Istio } from '../component-resources/cluster-svc'

export interface IstioStackArgs {
}

export class IstioStack extends pulumi.ComponentResource {
  constructor(name: string, args: IstioStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:IstioStack', name, {}, opts)

    /**
     * IMPORTANT: must have Istio Operator already installed (i.e. via `istioctl operator init`)
     */
    const istio = new Istio('istio', {}, { parent: this })

    this.registerOutputs()
  }
}