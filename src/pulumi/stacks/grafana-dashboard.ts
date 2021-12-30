import * as pulumi from '@pulumi/pulumi'
import { EmissaryHost, EmissaryMapping } from '../component-resources/cluster-svc'

export interface GrafanaDashboardStackArgs {
  hostname: string,
  emissaryNamespaceName: string,
  tlsSecretName: string,
  qualifiedSvcName: string,
}

export class GrafanaDashboardStack extends pulumi.ComponentResource {
  constructor(name: string, args: GrafanaDashboardStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:GrafanaDashboardStack', name, {}, opts)

    const {
      hostname,
      emissaryNamespaceName,
      tlsSecretName,
      qualifiedSvcName,
    } = args

    /**
     * Expose Grafana Dashboard as a separate subdomain
     */
    const namePrefix = 'grafana'
    const grafanaHost = new EmissaryHost(`${namePrefix}-host`, {
      namePrefix,
      namespace: emissaryNamespaceName,
      hostname,
      tlsSecretName,
    }, { parent: this })

    const grafanaMapping = new EmissaryMapping(`${namePrefix}-mapping`, {
      namespace: emissaryNamespaceName,
      hostname,
      prefix: '/',
      qualifiedSvcName,
    }, { parent: this })

    this.registerOutputs()
  }
}