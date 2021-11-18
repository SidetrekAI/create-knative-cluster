#! /usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { Command } from 'commander'
import { getColor, globalConfigs, runCliCmd } from './pulumi/helpers'
import { pulumiStackUp } from './pulumi/automation'
import clusterStack from './pulumi/stacks/cluster'
import clusterAutoscalerStack from './pulumi/stacks/cluster_autoscaler'
import appNsStack from './pulumi/stacks/app_ns'
import knativeOperatorStack from './pulumi/stacks/knative_operator'
import knativeServingStack from './pulumi/stacks/knative_serving'
import knativeEventingStack from './pulumi/stacks/knative_eventing'
import istioStack from './pulumi/stacks/istio'
import certManagerStack from './pulumi/stacks/cert_manager'
import knativeCustomIngressStack from './pulumi/stacks/knative_custom_ingress'
import kubePrometheusStackStack from './pulumi/stacks/kube_prometheus_stack'
import appSvcStagingStack from './pulumi/stacks/app_svc_staging'
import appStagingStack from './pulumi/stacks/app_staging'
import appSvcProdStack from './pulumi/stacks/app_svc_prod'
import appProdStack from './pulumi/stacks/app_prod'

const infoColor = getColor('info')

const program = new Command()

program
  .version('0.0.1', '-v, --version', 'output the version number')

program
  .command('init')
  .requiredOption('--aws-region <aws region>', 'Your AWS region - i.e. us-west-1')
  .option('--pulumi-org <Pulumi organization>', 'Name of Pulumi organization if using Pulumi\'s paid plan')
  .option('--custom-domain <custom domain>', 'Your custom domain - i.e. my-domain.com (defaults to example.com)')
  .option('--knative-operator-version <knative operator version>', 'Knative Operator version - i.e. 1.0.0')
  .option('--use-direnv <use direnv>', 'Whether to use direnv package to enable directory specific kubectl setup - i.e true', false)
  .description('create a Knative cluster in AWS EKS using Pulumi')
  .showHelpAfterError('(add --help for additional information)')
  .action(handleInit)



program
  .command('destroy')
  .description('destroy the entire project')
  .showHelpAfterError('(add --help for additional information)')
  .action(handleInit)

program
  .parseAsync()

// Run Pulumi automation scripts to setup Kubernetes and deploy all resources
async function handleInit(options: any) {
  console.log(infoColor('\n\nStarting project build...\n\n'))

  // Resource names
  const appStagingNamespaceName = 'staging'
  const appProdNamespaceName = 'prod'
  const knativeHttpsIngressGatewayName = 'knative-https-ingress-gateway'
  const kubePrometheusStackNamespaceName = 'kube-prometheus-stack'

  // Configs
  const {
    awsRegion,
    customDomain = 'example.com',
    knativeOperatorVersion = '1.0.0',
    useDirenv = false,
  } = options
  console.log('useDirenv', useDirenv)
  
  globalConfigs.set({ key: 'aws:region', configValue: { value: awsRegion, secret: false } })

  // Provision EKS cluster and setup Cluster Autoscaler for autoscaling nodes based on k8s pod requirements
  const clusterOutput = await pulumiStackUp('cluster', clusterStack)
  const clusterAutoscalerOutput = await pulumiStackUp('cluster_autoscaler', clusterAutoscalerStack, { inputs: [clusterOutput] })
  // console.log('clusterOutput.kubeconfig.value', clusterOutput.kubeconfig.value)
  
  // Setup kubectl
  const cwd = process.cwd() // dir where the cli is run (i.e. project root)
  fs.writeFileSync(path.resolve(cwd, 'kubeconfig-devs.json'), JSON.stringify(clusterOutput.kubeconfig.value, null, 2))
  if (useDirenv) {
    runCliCmd('echo export KUBECONFIG=$(pwd)/kubeconfig-devs.json > .envrc')
  } else {
    runCliCmd('export KUBECONFIG=$(pwd)/kubeconfig-devs.json')
  }
  
  // Create namespaces for staging/prod apps
  const appNsOutput = await pulumiStackUp('app_ns', appNsStack, { inputs: [clusterOutput, { appStagingNamespaceName, appProdNamespaceName }] })
  
  // Install istio operator via cli
  runCliCmd('istioctlx operator init')

  // Setup Knative (including Istio)
  // const knativeOperator = await pulumiStackUp('knative_operator', knativeOperatorStack, { inputs: [clusterOutput, { knativeOperatorVersion }] })
  // const knativeServing = await pulumiStackUp('knative_serving', knativeServingStack, { inputs: [clusterOutput, { customDomain, knativeHttpsIngressGatewayName }] })
  // const knativeEventing = await pulumiStackUp('knative_eventing', knativeEventingStack, { inputs: [clusterOutput] })
  // const istioOutput = await pulumiStackUp('istio', istioStack, { inputs: [clusterOutput] })

  // 
}