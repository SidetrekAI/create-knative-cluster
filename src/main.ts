import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as k8s from '@pulumi/kubernetes'
import { getQualifiedStackName, pulumiOutputsStore } from './pulumi/helpers'
import { simpleStore } from './pulumi/store'

const cliExecCtx = simpleStore.getState('cliExecutionContext')

const main = async () => {
  // console.log('cli execution context', cliExecCtx)
  const organization = cliExecCtx === 'pulumi' ? process.env.PULUMI_ORGANIZATION : simpleStore.getState('pulumiOrganization')
  const project = pulumi.getProject()
  const stack = cliExecCtx === 'pulumi' ? pulumi.getStack() : simpleStore.getState('currentStack')
  const config = new pulumi.Config()
  const customDomain = config.require('custom_domain')
  // GOTCHA: must await for the "current" first for Pulumi Automation API - otherwise it'll error out with aws:region
  // not available - the configs seem to be set asynchronously (even though async-await is used in the automation program)
  const currentAwsAccount = await aws.getCallerIdentity({})
  // console.log('currentAwsAccount', currentAwsAccount)
  const awsAccountId = currentAwsAccount.accountId
  const currentAwsRegion = await aws.getRegion()
  // console.log('currentAwsRegion', currentAwsRegion)
  const awsRegion = currentAwsRegion.name
  // console.log('awsRegion', awsRegion)
  
  const appStagingNamespaceName = 'staging'
  const appProdNamespaceName = 'prod'
  const knativeHttpsIngressGatewayName = 'knative-https-ingress-gateway'
  const kubePrometheusStackNamespaceName = 'kube-prometheus-stack'

  const clusterStackRef = new pulumi.StackReference(getQualifiedStackName(organization, 'cluster'))
  const dbStagingStackRef = new pulumi.StackReference(getQualifiedStackName(organization, 'db_staging'))
  const dbProdStackRef = new pulumi.StackReference(getQualifiedStackName(organization, 'db_prod'))

  const getK8sProvider = () => {
    const kubeconfig = clusterStackRef.getOutput('kubeconfig')
    const clusterName = clusterStackRef.getOutput('clusterName')
    return new k8s.Provider(`${clusterName}-provider`, { kubeconfig })
  }

  if (stack === 'test') {
    console.log('RUNNING!!!!!')
    const testStackOutput = { test: 'testing main.ts' }
    pulumiOutputsStore.set({ testStack: testStackOutput })
  }

  // /**
  //  * Stack: dev
  //  */
  // let devStackOutput = {}
  // if (stack === 'dev') {
  //   const { DevStack } = require('./pulumi/stacks/dev')
  //   const devStackOutput = new DevStack('dev-stack', {
  //     config,
  //     project,
  //     stackEnv: stack,
  //   })
  //   pulumiOutputsStore.set({ devStack: devStackOutput })
  // }

  /**
   * Stack: cluster
   */
  if (stack === 'cluster') {
    const { ClusterStack } = require('./pulumi/stacks/cluster')
    const clusterStackOutput = new ClusterStack('cluster-stack', { project })
    pulumiOutputsStore.set({ clusterStack: clusterStackOutput })
  }

  /**
   * Stack: app_ns
   */
  if (stack === 'app_ns') {
    const k8sProvider = getK8sProvider()
    const { AppNsStack } = require('./pulumi/stacks/app_ns')
    const appNsStackOutput = new AppNsStack('app-ns-stack', {
      appStagingNamespaceName,
      appProdNamespaceName,
    }, { provider: k8sProvider })
    pulumiOutputsStore.set({ appNsStack: appNsStackOutput })
  }

  /**
   * Stack: cluster_autoscaler
   */
  if (stack === 'cluster_autoscaler') {
    const clusterName = clusterStackRef.getOutput('clusterName')
    const clusterOidcProviderId = clusterStackRef.getOutput('clusterOidcProviderId')
    const eksHash = clusterOidcProviderId.apply(oidcProviderId => oidcProviderId.split('/').slice(-1)[0])

    const k8sProvider = getK8sProvider()
    const { ClusterAutoscalerStack } = require('./pulumi/stacks/cluster_autoscaler')
    const clusterAutoscalerStackOutput = new ClusterAutoscalerStack('cluster-autoscaler-stack', {
      awsAccountId,
      awsRegion,
      clusterName,
      eksHash,
    }, { provider: k8sProvider })
    pulumiOutputsStore.set({ clusterAutoscalerStack: clusterAutoscalerStackOutput })
  }

  /**
   * Stack: knative_operator
   */
  if (stack === 'knative_operator') {
    const knativeServingVersion = config.require('knative_serving_version')

    const k8sProvider = getK8sProvider()
    const { KnativeOperatorStack } = require('./pulumi/stacks/knative_operator')
    const knativeOperatorStackOutput = new KnativeOperatorStack('knative-operator-stack', {
      knativeServingVersion,
    }, { provider: k8sProvider })
    pulumiOutputsStore.set({ knativeOperatorStack: knativeOperatorStackOutput })
  }

  /**
   * Stack: knative_serving
   */
  if (stack === 'knative_serving') {
    const k8sProvider = getK8sProvider()
    const { KnativeServingStack } = require('./pulumi/stacks/knative_serving')
    const knativeServingStackOutput = new KnativeServingStack('knative-serving-stack', {
      customDomain,
      knativeHttpsIngressGatewayName,
    }, { provider: k8sProvider })
    pulumiOutputsStore.set({ knativeServingStack: knativeServingStackOutput })
  }

  /**
   * Stack: knative_eventing
   */
  if (stack === 'knative_eventing') {
    const k8sProvider = getK8sProvider()
    const { KnativeEventingStack } = require('./pulumi/stacks/knative_eventing')
    const knativeEventingStackOutput = new KnativeEventingStack('knative-eventing-stack', {}, { provider: k8sProvider })
    pulumiOutputsStore.set({ knativeEventingStack: knativeEventingStackOutput })
  }

  /**
   * Stack: istio_operator
   */
  if (stack === 'istio') {
    const k8sProvider = getK8sProvider()
    const { IstioStack } = require('./pulumi/stacks/istio')
    const istioStackOutput = new IstioStack('istio-stack', {}, { provider: k8sProvider })
    pulumiOutputsStore.set({ istioStack: istioStackOutput })
  }

  /**
   * Stack: cert_manager
   */
  if (stack === 'cert_manager') {
    const customDomainZoneId = config.require('custom_domain_zone_id')
    const acmeEmail = config.require('acme_email')

    const clusterOidcProviderId = clusterStackRef.getOutput('clusterOidcProviderId')
    const eksHash = clusterOidcProviderId.apply(oidcProviderId => oidcProviderId.split('/').slice(-1)[0])

    const k8sProvider = getK8sProvider()
    const { CertManagerStack } = require('./pulumi/stacks/cert_manager')
    const certManagerStackOutput = new CertManagerStack('cert-manager-stack', {
      awsAccountId,
      awsRegion,
      hostedZoneId: customDomainZoneId,
      customDomain,
      eksHash,
      acmeEmail,
    }, { provider: k8sProvider })
    pulumiOutputsStore.set({ certManagerStack: certManagerStackOutput })
  }

  /**
   * Stack: knative_custom_ingress
   */
  if (stack === 'knative_custom_ingress') {
    const k8sProvider = getK8sProvider()
    const { KnativeCustomIngressStack } = require('./pulumi/stacks/knative_custom_ingress')
    const knativeCustomIngressStackOutput = new KnativeCustomIngressStack('knative-custom-ingress-stack', {
      customDomain,
      appStagingNamespaceName,
      appProdNamespaceName,
      knativeHttpsIngressGatewayName,
    }, { provider: k8sProvider })
    pulumiOutputsStore.set({ knativeCustomIngressStack: knativeCustomIngressStackOutput })
  }

  /**
   * Stack: kube_prometheus_stack
   */
  if (stack === 'kube_prometheus_stack') {
    const grafanaUser = config.require('grafana_user')
    const grafanaPassword = config.requireSecret('grafana_password').apply(password => password)

    const k8sProvider = getK8sProvider()
    const { KubePrometheusStackStack } = require('./pulumi/stacks/kube_prometheus_stack')
    const kubePrometheusStackStackOutput = new KubePrometheusStackStack('kube-prometheus-stack-stack', {
      customDomain,
      knativeHttpsIngressGatewayName,
      kubePrometheusStackNamespaceName,
      grafanaUser,
      grafanaPassword,
    }, { provider: k8sProvider })
    pulumiOutputsStore.set({ kubePrometheusStackStack: kubePrometheusStackStackOutput })
  }








  /**
   * Stack: db_staging
   * Stack: db_prod
   */
  if (stack === 'db_staging' || stack === 'db_prod') {
    const dbUser = config.require('db_user')
    const dbPassword = config.requireSecret('db_password').apply(password => password)

    const stackEnv = stack.includes('prod') ? 'prod' : 'staging'
    const appNamespaceName = stackEnv === 'prod' ? appProdNamespaceName : appStagingNamespaceName
    const sgRdsId = clusterStackRef.getOutput('sgRdsId')
    const vpcPublicSubnetIds = clusterStackRef.getOutput('vpcPublicSubnetIds')

    const k8sProvider = getK8sProvider()
    const { DbStack } = require('./pulumi/stacks/db')
    const dbStackOutput = new DbStack('app-svc-stack', {
      dbUser,
      dbPassword,
      stackEnv,
      appNamespaceName,
      sgRdsId,
      vpcPublicSubnetIds,
    }, { provider: k8sProvider })
    pulumiOutputsStore.set({ dbStack: dbStackOutput })
  }

  /**
   * Stack: app_staging
   * Stack: app_prod
   */
  if (stack === 'app_staging' || stack === 'app_prod') {
    const stackEnv = stack.includes('prod') ? 'prod' : 'staging'
    const appNamespaceName = stackEnv === 'prod' ? appProdNamespaceName : appStagingNamespaceName
    const dbSecretStagingName = dbStagingStackRef.getOutput('dbSecretName')
    const dbSecretProdName = dbProdStackRef.getOutput('dbSecretName')
    const dbSecretName = stackEnv === 'prod' ? dbSecretProdName : dbSecretStagingName

    const k8sProvider = getK8sProvider()
    const { AppStack } = require('./pulumi/stacks/app')
    const appStackOutput = new AppStack('app-stack', {
      project,
      stackEnv,
      customDomain,
      appNamespaceName,
      dbSecretName,
      knativeHttpsIngressGatewayName,
    }, { provider: k8sProvider })
    pulumiOutputsStore.set({ appStack: appStackOutput })
  }

  return {
    project,
    stack,
    ...pulumiOutputsStore.get(),
  }
}

export = main