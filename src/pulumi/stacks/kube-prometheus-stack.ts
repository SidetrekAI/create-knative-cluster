import * as pulumi from '@pulumi/pulumi'
import { KubePrometheusStack } from '../component-resources/monitoring'

export interface KubePrometheusStackStackArgs {
  kubePrometheusStackNamespaceName: string,
  grafanaUser: string,
  grafanaPassword: pulumi.Output<string>,
}

export class KubePrometheusStackStack extends pulumi.ComponentResource {
  constructor(name: string, args: KubePrometheusStackStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:KubePrometheusStackStack', name, {}, opts)

    const {
      kubePrometheusStackNamespaceName,
      grafanaUser,
      grafanaPassword,
    } = args

    /**
     * Set up Kube Prometheus Stack (end-to-end k8s monitoring using prometheus, grafana, etc)
     */
    const kubePrometheusStack = new KubePrometheusStack(`kube-prometheus-stack`, {
      kubePrometheusStackNamespaceName,
      grafanaUser,
      grafanaPassword,
    }, { parent: this })

   this.registerOutputs()
  }
}