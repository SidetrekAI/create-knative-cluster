import * as pulumi from '@pulumi/pulumi'
import {
  KubePrometheusStack,
  KnativeServiceMonitors,
  KnativeGrafanaDashboards,
  KnativeVirtualService,
} from '../component_resources'

export interface KubePrometheusStackStackArgs {
  customDomain: string,
  knativeHttpsIngressGatewayName: string,
  kubePrometheusStackNamespaceName: string,
  grafanaUser: string,
  grafanaPassword: pulumi.Output<string>,
}

export class KubePrometheusStackStack extends pulumi.ComponentResource {
  constructor(name: string, args: KubePrometheusStackStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:KubePrometheusStackStack', name, {}, opts)

    const {
      customDomain,
      knativeHttpsIngressGatewayName,
      kubePrometheusStackNamespaceName,
      grafanaUser,
      grafanaPassword,
    } = args

    /**
     * Set up Kube Prometheus Stack (end-to-end k8s monitoring using prometheus, grafana, etc)
     */
    const kubePrometheusStack = new KubePrometheusStack('kube-prometheus-stack', {
      kubePrometheusStackNamespaceName,
      grafanaUser,
      grafanaPassword,
    }, { parent: this })

    /**
     * Monitor Knative using Kube Prometheus Stack
     */
    const knativeServiceMonitors = new KnativeServiceMonitors('knative-service-monitors',
      {}, { parent: this, dependsOn: [kubePrometheusStack] })
    const knativeGrafanaDashboards = new KnativeGrafanaDashboards('knative-grafana-dashboards',
      {}, { parent: this, dependsOn: [kubePrometheusStack] })

    /**
     * Expose Prometheus Dashboard as a separate subdomain
     */
    const prometheusKvsName = 'prometheus-route'
    const prometheusKvs = new KnativeVirtualService(prometheusKvsName, {
      namespace: kubePrometheusStackNamespaceName,
      gateways: [`${knativeHttpsIngressGatewayName}.knative-serving.svc.cluster.local`],
      hosts: [`prometheus-dashboard.${customDomain}`],
      routes: [
        {
          uri: '/',
          rewriteUri: '/',
          serviceHostname: `kube-prometheus-stack-prometheus.${kubePrometheusStackNamespaceName}.svc.cluster.local`,
        },
      ]
    }, { parent: this, dependsOn: [kubePrometheusStack] })

    /**
     * Expose Grafana Dashboard as a separate subdomain
     */
    const grafanaKvsName = 'grafana-route'
    const grafanaKvs = new KnativeVirtualService(grafanaKvsName, {
      namespace: kubePrometheusStackNamespaceName,
      gateways: [`${knativeHttpsIngressGatewayName}.knative-serving.svc.cluster.local`],
      hosts: [`grafana-dashboard.${customDomain}`],
      routes: [
        {
          uri: '/',
          rewriteUri: '/',
          serviceHostname: `kube-prometheus-stack-grafana.${kubePrometheusStackNamespaceName}.svc.cluster.local`,
        },
      ]
    }, { parent: this, dependsOn: [kubePrometheusStack] })

    this.registerOutputs()
  }
}