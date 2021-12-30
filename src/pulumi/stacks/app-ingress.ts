import * as pulumi from '@pulumi/pulumi'
import { EmissaryHost, EmissaryMapping } from '../component-resources/cluster-svc'

export interface AppIngressStackArgs {
  namePrefix: string,
  emissaryNamespaceName: string,
  hostname: string,
  tlsSecretName: string,
  qualifiedSvcName: string,
}

export class AppIngressStack extends pulumi.ComponentResource {
  constructor(name: string, args: AppIngressStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:AppIngressStack', name, {}, opts)

    const {
      namePrefix,
      emissaryNamespaceName,
      hostname,
      tlsSecretName,
      qualifiedSvcName,
    } = args

    const appHost = new EmissaryHost(`${namePrefix}-host`, {
      namePrefix,
      namespace: emissaryNamespaceName,
      hostname,
      tlsSecretName,
    }, { parent: this })

    const appMapping = new EmissaryMapping(`${namePrefix}-mapping`, {
      namespace: emissaryNamespaceName,
      hostname,
      prefix: '/',
      qualifiedSvcName,
    }, { parent: this })

    this.registerOutputs()
  }
}