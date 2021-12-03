import * as path from 'path'
import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as awsx from '@pulumi/awsx'
import * as k8s from '@pulumi/kubernetes'
import { simpleStore } from './pulumi/store'

const cwd = process.cwd() // dir where the cli is run (i.e. project root)
const cliExecCtx = simpleStore.getState('cliExecutionContext')
const cliOptions = simpleStore.getState('cliOptions')

const main = async () => {
  // console.log('cli execution context', cliExecCtx)
  const config = new pulumi.Config()

  const project = pulumi.getProject()
  const projectRootPath = cliExecCtx === 'ckc' ? cwd : path.resolve(__dirname)
  const stack = cliExecCtx === 'ckc' ? simpleStore.getState('currentStack') : pulumi.getStack()
  const organization = config.require('pulumi_organization')
  const customDomain = config.require('custom_domain')
  const { accountId: awsAccountId } = await aws.getCallerIdentity({})
  const { name: awsRegion } = await aws.getRegion()

  const appStagingNamespaceName = 'app-staging'
  const appProdNamespaceName = 'app-prod'
  const knativeHttpsIngressGatewayName = 'knative-https-ingress-gateway'
  const kubePrometheusStackNamespaceName = 'kube-prometheus-stack'

  // DB helpers
  const getDbStackOutputs = (config: pulumi.Config, dbStackRef: any) => {
    const dbUser = config.require('db_user')
    const dbPassword = config.requireSecret('db_password').apply(password => password)
    const dbName = dbStackRef.getOutput('rdsName') as pulumi.Output<string>
    const dbEndpoint = dbStackRef.getOutput('rdsEndpoint') as pulumi.Output<string>
    const dbPort = dbStackRef.getOutput('rdsPort') as pulumi.Output<number>
    return { dbUser, dbPassword, dbName, dbEndpoint, dbPort }
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
  // 
  //   return devStackOutput
  // }

  /**
   * Stack: cluster
   */
  if (stack === 'cluster') {
    const { ClusterStack } = await import('./pulumi/stacks/cluster')
    const clusterStackOutput = new ClusterStack('cluster-stack', { project })
    return clusterStackOutput
  }

  const clusterStackRef = new pulumi.StackReference(`${organization}/${project}/cluster`)
  const vpc = clusterStackRef.getOutput('vpc') as unknown as awsx.ec2.Vpc
  const vpcPublicSubnetIds = clusterStackRef.getOutput('vpcPublicSubnetIds')
  const kubeconfig = clusterStackRef.getOutput('kubeconfig') as pulumi.Output<any>
  const k8sProvider = new k8s.Provider('k8s-provider', { kubeconfig })

  /**
   * Stack: cluster-autoscaler
   */
  if (stack === 'cluster-autoscaler') {
    const clusterName = clusterStackRef.getOutput('clusterName') as pulumi.Output<string>
    const eksHash = clusterStackRef.getOutput('eksHash') as pulumi.Output<string>

    const { ClusterAutoscalerStack } = await import('./pulumi/stacks/cluster-autoscaler')
    const clusterAutoscalerStackOutput = new ClusterAutoscalerStack('cluster-autoscaler-stack', {
      awsAccountId,
      awsRegion,
      clusterName,
      eksHash,
    }, { provider: k8sProvider })
    return clusterAutoscalerStackOutput
  }

  /**
   * Stack: knative-operator
   */
  if (stack === 'knative-operator') {
    const knativeServingVersion = config.require('knative_serving_version')

    const { KnativeOperatorStack } = await import('./pulumi/stacks/knative-operator')
    const knativeOperatorStackOutput = new KnativeOperatorStack('knative-operator-stack', {
      knativeServingVersion,
    }, { provider: k8sProvider })
    return knativeOperatorStackOutput
  }

  /**
   * Stack: knative-serving
   */
  if (stack === 'knative-serving') {
    const { KnativeServingStack } = await import('./pulumi/stacks/knative-serving')
    const knativeServingStackOutput = new KnativeServingStack('knative-serving-stack', {
      customDomain,
      knativeHttpsIngressGatewayName,
    }, { provider: k8sProvider })
    return knativeServingStackOutput
  }

  /**
   * Stack: knative-eventing
   */
  if (stack === 'knative-eventing') {
    const { KnativeEventingStack } = await import('./pulumi/stacks/knative-eventing')
    const knativeEventingStackOutput = new KnativeEventingStack('knative-eventing-stack', {}, { provider: k8sProvider })
    return knativeEventingStackOutput
  }

  /**
   * Stack: istio
   */
  if (stack === 'istio') {
    const { IstioStack } = await import('./pulumi/stacks/istio')
    const istioStackOutput = new IstioStack('istio-stack', {}, { provider: k8sProvider })
    return istioStackOutput
  }

  /**
   * Stack: cert-manager
   */
  if (stack === 'cert-manager') {
    const customDomainZoneId = config.require('custom_domain_zone_id')
    const acmeEmail = config.require('acme_email')

    const eksHash = clusterStackRef.getOutput('eksHash') as pulumi.Output<string>

    const { CertManagerStack } = await import('./pulumi/stacks/cert-manager')
    const certManagerStackOutput = new CertManagerStack('cert-manager-stack', {
      awsAccountId,
      awsRegion,
      hostedZoneId: customDomainZoneId,
      customDomain,
      eksHash,
      acmeEmail,
    }, { provider: k8sProvider })
    return certManagerStackOutput
  }

  /**
   * Stack: knative-custom-ingress
   */
  if (stack === 'knative-custom-ingress') {
    const { KnativeCustomIngressStack } = await import('./pulumi/stacks/knative-custom-ingress')
    const knativeCustomIngressStackOutput = new KnativeCustomIngressStack('knative-custom-ingress-stack', {
      customDomain,
      knativeHttpsIngressGatewayName,
    }, { provider: k8sProvider })
    return knativeCustomIngressStackOutput
  }

  /**
   * Stack: kube-prometheus-stack
   */
  if (stack === 'kube-prometheus-stack') {
    const grafanaUser = config.require('grafana_user')
    const grafanaPassword = config.requireSecret('grafana_password').apply(password => password)

    const { KubePrometheusStackStack } = await import('./pulumi/stacks/kube-prometheus-stack')
    const kubePrometheusStackStackOutput = new KubePrometheusStackStack('kube-prometheus-stack-stack', {
      customDomain,
      knativeHttpsIngressGatewayName,
      kubePrometheusStackNamespaceName,
      grafanaUser,
      grafanaPassword,
    }, { provider: k8sProvider })
    return kubePrometheusStackStackOutput
  }

  /**
   * Stack: app-ns
   */
  if (stack === 'app-ns') {
    const { AppNsStack } = await import('./pulumi/stacks/app-ns')
    const appNsStackOutput = new AppNsStack('app-ns-stack', {
      appStagingNamespaceName,
      appProdNamespaceName,
    }, { provider: k8sProvider })
    return appNsStackOutput
  }

  /**
   * Stack: db-staging
   */
  if (stack === 'db-staging') {
    const dbUser = config.require('db_user')
    const dbPassword = config.requireSecret('db_password').apply(password => password)
  
    const { DbStack } = await import('./pulumi/stacks/db')
    const dbStagingStackOutput = new DbStack('db-staging-stack', {
      dbUser,
      dbPassword,
      stackEnv: 'staging',
      appNamespaceName: appStagingNamespaceName,
      vpc,
      vpcPublicSubnetIds,
    }, { provider: k8sProvider })
    return dbStagingStackOutput
  }

  let dbStagingStackRef
  try {
    dbStagingStackRef = new pulumi.StackReference(`${organization}/${project}/db-staging`)
  } catch (err) {
    console.log('dbStagingStackRef err', err)
  }

  /**
   * Stack: app-staging
   */
  if (stack === 'app-staging') {
    const dbOpts = dbStagingStackRef ? getDbStackOutputs(config, dbStagingStackRef) : {}
    console.log('projectRootPath', projectRootPath)
    console.log('dbOpts', dbOpts)

    const { AppStack } = await import('./pulumi/stacks/app')
    const appStackOutput = new AppStack('app-staging-stack', {
      projectRootPath,
      project,
      stackEnv: 'staging',
      customDomain,
      appNamespaceName: appStagingNamespaceName,
      knativeHttpsIngressGatewayName,
      ...dbOpts,
    }, { provider: k8sProvider })
    return appStackOutput
  }

  /**
   * Stack: db-prod
   */
  if (stack === 'db-prod') {
    const dbUser = config.require('db_user')
    const dbPassword = config.requireSecret('db_password').apply(password => password)

    const { DbStack } = await import('./pulumi/stacks/db')
    const dbProdStackOutput = new DbStack('db-prod-stack', {
      dbUser,
      dbPassword,
      stackEnv: 'prod',
      appNamespaceName: appProdNamespaceName,
      vpc,
      vpcPublicSubnetIds,
    }, { provider: k8sProvider })
    return dbProdStackOutput
  }

  let dbProdStackRef
  try {
    dbProdStackRef = new pulumi.StackReference(`${organization}/${project}/db-prod`)
  } catch (err) {
    console.log('dbProdStackRef err', err)
  }

  /**
   * Stack: app-staging
   */
  if (stack === 'app-prod') {
    const dbOpts = dbProdStackRef ? getDbStackOutputs(config, dbProdStackRef) : {}
    
    const { AppStack } = await import('./pulumi/stacks/app')
    const appStackOutput = new AppStack('app-prod-stack', {
      projectRootPath,
      project,
      stackEnv: 'prod',
      customDomain,
      appNamespaceName: appProdNamespaceName,
      knativeHttpsIngressGatewayName,
      ...dbOpts,
    }, { provider: k8sProvider })
    return appStackOutput
  }

  return {
    project,
    stack,
  }
}

export = main