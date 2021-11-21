#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { Command } from 'commander'
import {
  cliExecutionContext,
  getColor,
  cliOptionsStore,
  runCliCmd,
  globalPulumiConfigs,
  setPulumiConfig,
  getProjectName,
  currentStack,
  createPulumiStacks,
} from './pulumi/helpers'
import { PulumiAutomation } from './pulumi/automation/automation'
import { PulumiConfig } from './pulumi/types'

const infoColor = getColor('info')
const cwd = process.cwd() // dir where the cli is run (i.e. project root)

const program = new Command()

program
  .version('0.0.1', '-v, --version', 'output the version number')

program
  .command('init')
  .requiredOption('--aws-region <aws region>', 'aws region; i.e. us-west-1')
  .requiredOption('--pulumi-organization <Pulumi organization>', 'name of your Pulumi organization')
  .requiredOption('--custom-domain <custom domain>', 'your custom domain; i.e. your-domain.com')
  .requiredOption('--custom-domain-zone-id <custom domain zone ID>', 'AWS Route53 hosted zone ID for your custom domain; i.e. Z02401234DADFCMEXX64X')
  .requiredOption('--acme-email <ACME email>', 'https certificate issuer (Let\'s Encrypt) will use this to contact you about expiring certificates, and issues related to your account')
  .option('--use-direnv <use direnv>', 'to enable directory specific kubectl setup; defaults to false', false)
  .option('--db-user <DB user>', 'AWS RDS postgres db user name; defaults to admin')
  .option('--db-password <DB user>', 'AWS RDS postgres db password; defaults to adminpass')
  .option('--grafana-user <grafana user name>', 'to enable directory specific kubectl setup; defaults to admin', 'admin')
  .option('--grafana-password <grafana password>', 'to enable directory specific kubectl setup; defaults to adminpass', 'adminpass')
  .description('create a Knative cluster in AWS EKS using Pulumi')
  .showHelpAfterError('(add --help for additional information)')
  .action(handleInit)

// program
//   .command('destroy')
//   .description('destroy the entire project')
//   .showHelpAfterError('(add --help for additional information)')
//   .action(handleDestroy)

program
  .parseAsync()

/**
 * STRATEGY
 * 
 *    Run Pulumi automation scripts to setup Kubernetes and deploy all resources (since as of today, Pulumi CLI cannot be run in a Node script)
 *    Set Pulumi configs via cli - this ensures that configs are stored locally for easier local maintenance (i.e. Pulumi.<stack>.yaml file will be created)
 */
async function handleInit(options: any) {
  console.log(infoColor('\n\nStarting project build...\n\n'))
  console.log('opions', options)

  // Make options available in other modules
  cliOptionsStore.set(options)

  const {
    awsRegion,
    customDomain,
    customDomainZoneId,
    acmeEmail,
    dbUser,
    dbPassword,
    useDirenv,
    grafanaUser,
    grafanaPassword,
  } = options

  // Set global pulumi configs (these will run for every pulumi stack up)
  globalPulumiConfigs.set([
    { key: 'aws:region', configValue: { value: awsRegion } }, // GOTCHA: adding secret field will make this fail
    { key: 'custom_domain', configValue: { value: customDomain } },
  ])

  // First set the cli execution context so that mainPulumiProgram will get the stack name from pulumiStackUp func
  cliExecutionContext.set('ckc')

  // Must be imported after the cli execution context is set so it has the right context
  const mainPulumiProgram = require('./main')

  // Create stacks for StackReferences first - prevents Pulumi StackReference from erroring out in mainPulumiProgram
  createPulumiStacks(['cluster', 'db_staging', 'db_prod'])
  
  const project = getProjectName()
  const pulumiA = new PulumiAutomation(project, {
    globalConfigs: globalPulumiConfigs.get(),
    beforePulumiRun: (stack) => {
      // Set the current stack so that mainPulumiProgram will have the right stack
      currentStack.set(stack)

      // Set the globalConfigs via cli
      const globalConfigs = globalPulumiConfigs.get()
      globalConfigs.forEach((globalConfig: PulumiConfig) => setPulumiConfig(stack, globalConfig))
    },
  })

  // Test
  await pulumiA.stackUp('test', { createPulumiProgram: () => mainPulumiProgram })

  // // Provision EKS cluster and setup Cluster Autoscaler for autoscaling nodes based on k8s pod requirements
  // const { clusterStack: clusterOutputs } = createAndRunPulumiStack('cluster')
  // createAndRunPulumiStack('cluster_autoscaler')

  // // Setup kubectl
  // fs.writeFileSync(path.resolve(cwd, 'kubeconfig-devs.json'), JSON.stringify(clusterOutputs.kubeconfig.value, null, 2))
  // if (useDirenv) {
  //   runCliCmd('echo export KUBECONFIG=$(pwd)/kubeconfig-devs.json > .envrc')
  // } else {
  //   runCliCmd('export KUBECONFIG=$(pwd)/kubeconfig-devs.json')
  // }

  // // Create namespaces for staging/prod apps
  // createAndRunPulumiStack('app_ns')

  // // Install istio operator via cli
  // runCliCmd('istioctlx operator init')

  // // Setup Knative (including Istio)
  // setPulumiConfig('knative_operator', { key: 'knative_serving_version', configValue: { value: '1.0.0' } })
  // createAndRunPulumiStack('knative_operator')

  // createAndRunPulumiStack('knative_serving')
  // createAndRunPulumiStack('knative_eventing')
  // createAndRunPulumiStack('istio')

  // // Setup cert-manager
  // setPulumiConfig('cert_manager', { key: 'custom_domain_zone_id', configValue: { value: customDomainZoneId } })
  // setPulumiConfig('cert_manager', { key: 'acme_email', configValue: { value: acmeEmail } })
  // createAndRunPulumiStack('cert_manager')

  // // Setup custom gateway for Knative so that custom Virtual Services can be used
  // createAndRunPulumiStack('knative_custom_ingress')

  // // Set up Kube Prometheus Stack (end-to-end k8s monitoring using prometheus, grafana, etc)
  // setPulumiConfig('kube_prometheus_stack', { key: 'grafana_user', configValue: { value: grafanaUser } })
  // setPulumiConfig('kube_prometheus_stack', { key: 'grafana_password', configValue: { value: grafanaPassword, secret: true } })
  // createAndRunPulumiStack('kube_prometheus_stack')

  // // Set up staging db and app
  // setPulumiConfig('db_staging', { key: 'db_user', configValue: { value: dbUser } })
  // setPulumiConfig('db_staging', { key: 'db_password', configValue: { value: dbPassword, secret: true } })
  // createAndRunPulumiStack('db_staging')
  // createAndRunPulumiStack('app_staging')

  // // Set up prod db and app
  // setPulumiConfig('db_staging', { key: 'db_user', configValue: { value: dbUser } })
  // setPulumiConfig('db_staging', { key: 'db_password', configValue: { value: dbPassword, secret: true } })
  // createAndRunPulumiStack('db_prod')
  // createAndRunPulumiStack('app_prod')

  // TODO: copy the /pulumi dir to project root (test it without the actual process) for maintenance
}


// // Run Pulumi automation scripts to setup Kubernetes and deploy all resources
// async function handleInit(options: any) {
//   console.log(infoColor('\n\nStarting project build...\n\n'))

//   cliOptionsStore.set(options)

//   const {
//     awsRegion,
//     customDomain,
//     customDomainZoneId,
//     acmeEmail,
//     dbUser,
//     dbPassword,
//     useDirenv,
//     grafanaUser,
//     grafanaPassword,
//   } = options

//   globalPulumiConfigs.set([
//     { key: 'aws:region', configValue: { value: awsRegion } },
//     { key: 'custom_domain', configValue: { value: customDomain } },
//   ])

//   // Test
//   const testOutputs = createAndRunPulumiStack('test')
//   console.log('testOutputs', testOutputs)

//   // // Provision EKS cluster and setup Cluster Autoscaler for autoscaling nodes based on k8s pod requirements
//   // const { clusterStack: clusterOutputs } = createAndRunPulumiStack('cluster')
//   // createAndRunPulumiStack('cluster_autoscaler')

//   // // Setup kubectl
//   // fs.writeFileSync(path.resolve(cwd, 'kubeconfig-devs.json'), JSON.stringify(clusterOutputs.kubeconfig.value, null, 2))
//   // if (useDirenv) {
//   //   runCliCmd('echo export KUBECONFIG=$(pwd)/kubeconfig-devs.json > .envrc')
//   // } else {
//   //   runCliCmd('export KUBECONFIG=$(pwd)/kubeconfig-devs.json')
//   // }

//   // // Create namespaces for staging/prod apps
//   // createAndRunPulumiStack('app_ns')

//   // // Install istio operator via cli
//   // runCliCmd('istioctlx operator init')

//   // // Setup Knative (including Istio)
//   // setPulumiConfig('knative_operator', { key: 'knative_serving_version', configValue: { value: '1.0.0' } })
//   // createAndRunPulumiStack('knative_operator')

//   // createAndRunPulumiStack('knative_serving')
//   // createAndRunPulumiStack('knative_eventing')
//   // createAndRunPulumiStack('istio')

//   // // Setup cert-manager
//   // setPulumiConfig('cert_manager', { key: 'custom_domain_zone_id', configValue: { value: customDomainZoneId } })
//   // setPulumiConfig('cert_manager', { key: 'acme_email', configValue: { value: acmeEmail } })
//   // createAndRunPulumiStack('cert_manager')

//   // // Setup custom gateway for Knative so that custom Virtual Services can be used
//   // createAndRunPulumiStack('knative_custom_ingress')

//   // // Set up Kube Prometheus Stack (end-to-end k8s monitoring using prometheus, grafana, etc)
//   // setPulumiConfig('kube_prometheus_stack', { key: 'grafana_user', configValue: { value: grafanaUser } })
//   // setPulumiConfig('kube_prometheus_stack', { key: 'grafana_password', configValue: { value: grafanaPassword, secret: true } })
//   // createAndRunPulumiStack('kube_prometheus_stack')

//   // // Set up staging db and app
//   // setPulumiConfig('db_staging', { key: 'db_user', configValue: { value: dbUser } })
//   // setPulumiConfig('db_staging', { key: 'db_password', configValue: { value: dbPassword, secret: true } })
//   // createAndRunPulumiStack('db_staging')
//   // createAndRunPulumiStack('app_staging')

//   // // Set up prod db and app
//   // setPulumiConfig('db_staging', { key: 'db_user', configValue: { value: dbUser } })
//   // setPulumiConfig('db_staging', { key: 'db_password', configValue: { value: dbPassword, secret: true } })
//   // createAndRunPulumiStack('db_prod')
//   // createAndRunPulumiStack('app_prod')

//   // TODO: copy the /pulumi dir to project root (test it without the actual process) for maintenance
// }