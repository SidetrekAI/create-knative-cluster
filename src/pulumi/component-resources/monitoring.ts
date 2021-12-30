import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'

/**
 * Set up Kube Prometheus Stack (including Prometheus, Grafana, Alert Manager, etc)
 */
 interface KubePrometheusStackArgs {
    kubePrometheusStackNamespaceName: string,
    grafanaUser: string,
    grafanaPassword: pulumi.Output<string>,
  }
  
  export class KubePrometheusStack extends pulumi.ComponentResource {
    constructor(name: string, args: KubePrometheusStackArgs, opts: any) {
      super('custom:k8s:KubePrometheusStack', name, {}, opts)
  
      const {
        kubePrometheusStackNamespaceName,
        grafanaUser,
        grafanaPassword,
      } = args
  
      const kubePrometheusStackNamespace = new k8s.core.v1.Namespace(kubePrometheusStackNamespaceName, {
        metadata: { name: kubePrometheusStackNamespaceName },
      }, { parent: this })
  
      const grafanaAccessSecretName = 'grafana-access-secret'
      const grafanaAccessSecret = new k8s.core.v1.Secret(grafanaAccessSecretName, {
        metadata: {
          name: grafanaAccessSecretName,
          namespace: kubePrometheusStackNamespace.metadata.name,
        },
        stringData: {
          'admin-user': grafanaUser,
          'admin-password': grafanaPassword,
        }
      }, { parent: this })
  
      const kubePrometheusStackReleaseName = `${name}`
      const kubePrometheusStack = new k8s.helm.v3.Release(kubePrometheusStackReleaseName, {
        skipCrds: false, // set `skipCrds: true` if you encounter `error: rendered manifests contain a resource that already exists.`
        name: kubePrometheusStackReleaseName,
        namespace: kubePrometheusStackNamespace.metadata.name,
        chart: 'kube-prometheus-stack',
        repositoryOpts: {
          repo: 'https://prometheus-community.github.io/helm-charts',
        },
        values: {
          // See list of all values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-state-metrics/values.yaml
          'kube-state-metrics': {
            'metricLabelsAllowlist': [
              'pods=[*]',
              'deployments=[app.kubernetes.io/name,app.kubernetes.io/component,app.kubernetes.io/instance]'
            ],
          },
          // See list of all values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
          prometheus: {
            prometheusSpec: {
              serviceMonitorSelectorNilUsesHelmValues: false,
              podMonitorSelectorNilUsesHelmValues: false,
            },
          },
          // See list of all values: https://github.com/grafana/helm-charts/blob/main/charts/grafana/values.yaml
          grafana: {
            sidecar: {
              dashboards: {
                enabled: true,
                searchNamespace: 'ALL',
              }
            },
            admin: {
              existingSecret: grafanaAccessSecret.metadata.name,
              userKey: 'admin-user',
              passwordKey: 'admin-password',
            }
          },
        },
        cleanupOnFail: true,
      }, { parent: this })
  
      this.registerOutputs()
    }
  }