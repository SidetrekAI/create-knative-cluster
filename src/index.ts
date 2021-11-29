#!/usr/bin/env node

import * as fs from 'fs-extra'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { Command } from 'commander'
import * as ora from 'ora'
import * as enquirer from 'enquirer'
import {
  getColor,
  runCliCmd,
  setPulumiConfigsViaCli,
  getProjectName,
} from './pulumi/helpers'
import { PulumiAutomation } from './pulumi/automation/automation'
import { simpleStore } from './pulumi/store'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const infoColor = getColor('info')
const successColor = getColor('success')
const gradient = require('gradient-string')
const cwd = process.cwd() // dir where the cli is run (i.e. project root)

type CliOptions = {
  [key: string]: any,
}

const program = new Command()

program
  .version('0.0.1', '-v, --version', 'output the version number')

program
  .command('init')
  .requiredOption('--aws-region <aws region>', 'aws region; i.e. us-west-1')
  .requiredOption('--pulumi-organization <Pulumi account/organization>', 'name of your Pulumi account (if free plan) or organization (if paid plan)')
  .requiredOption('--custom-domain <custom domain>', 'your custom domain; i.e. your-domain.com')
  .requiredOption('--custom-domain-zone-id <custom domain zone ID>', 'AWS Route53 Hosted Zone ID for your custom domain; i.e. Z02401234DADFCMEXX64X')
  .requiredOption('--acme-email <ACME email>', 'https certificate issuer (Let\'s Encrypt) will use this to contact you about expiring certificates, and issues related to your account')
  .option('--use-direnv', 'to enable directory specific kubectl setup; defaults to false', false)
  .option('--grafana-user <grafana user name>', 'to enable directory specific kubectl setup; defaults to admin', 'admin')
  .option('--grafana-password <grafana password>', 'to enable directory specific kubectl setup; defaults to adminpass', 'adminpass')
  .description('create a Knative cluster in AWS EKS using Pulumi')
  .showHelpAfterError('(add --help for additional information)')
  .action(handleInit)


/**
 * STRATEGY
 * 
 *    Run Pulumi automation scripts to setup Kubernetes and deploy all resources (since as of today, Pulumi CLI cannot be run in a Node script)
 * 
 *    Configs: Set Pulumi configs both via Automation API arg and via cli - this ensures that configs are set correctly for ckc cli execution but
 *    also stored locally for local Pulumi management (i.e. Pulumi.<stack>.yaml file will be created)
 */
async function handleInit(options: CliOptions) {
  console.info(infoColor('\nInitializing project...\n'))
  console.time('Done in')
  // console.log('cli options', options)

  // Make options available in other modules
  simpleStore.setState('cliOptions', options)

  const {
    awsRegion,
    pulumiOrganization,
    customDomain,
    customDomainZoneId,
    acmeEmail,
    useDirenv,
    grafanaUser,
    grafanaPassword,
  } = options

  /**
   * Copy Pulumi files for local management (unless it's development env)
   */
  const spinner = ora().start(infoColor(`Copying Pulumi files to project folder...`))

  if (process.env.CKC_CLI_ENV !== 'development') {
    await fs.copy(path.resolve(__dirname, '../src/main.ts'), path.resolve(cwd, 'index.ts'))
    await fs.copy(path.resolve(__dirname, '../src/pulumi'), path.resolve(cwd, 'pulumi'))
  }

  spinner.succeed(successColor('Successfully copied Pulumi files to project folder'))

  /**
   * Run Pulumi Automation scripts to set up Kubernetes and deploy all resources
   */
  spinner.start(infoColor(`Prepping for Pulumi stack creations...`))

  // Set global pulumi configs (these will run for every pulumi stack up)
  simpleStore.setState('globalPulumiConfigMap', {
    'aws:region': { value: awsRegion },
    'pulumi_organization': { value: pulumiOrganization },
    'custom_domain': { value: customDomain },
  })

  // First set the cli execution context so that mainPulumiProgram will get the stack name from pulumiStackUp func
  simpleStore.setState('cliExecutionContext', 'ckc')

  // Must be imported after the cli execution context and other required states are set
  const mainPulumiProgram = await import('./main')

  const projectName = getProjectName()
  const globalPulumiConfigMap = simpleStore.getState('globalPulumiConfigMap')
  const pulumiA = new PulumiAutomation(projectName, {
    globalConfigMap: globalPulumiConfigMap,
    beforePulumiRun: ({ stackName }) => {
      // Set the current stack so that mainPulumiProgram will have the right stack
      simpleStore.setState('currentStack', stackName)
    },
    afterPulumiRun: async ({ stackName, configMap }) => {
      // Set the globalConfigs and configs in cli as well so that Pulumi can be locally managed (i.e. Pulumi.<stack>.yaml file is filled with right configs)
      await setPulumiConfigsViaCli(pulumiOrganization, stackName, { ...globalPulumiConfigMap, ...configMap })
    },
  })
  spinner.succeed(successColor('Successfully completed prep'))

  /**
   * Create stacks
   * 
   *    NOTE: order matters
   */

  // Provision EKS cluster with managed node groups
  const clusterOutputs = await pulumiA.stackUp('cluster', { createPulumiProgram: () => mainPulumiProgram })

  // Set up Cluster Autoscaler for autoscaling nodes based on k8s pod requirements
  await pulumiA.stackUp('cluster-autoscaler', { createPulumiProgram: () => mainPulumiProgram })

  // Set up kubectl
  spinner.start(infoColor(`Exporting kubeconfig for kubectl...`))
  await fs.writeFile(path.resolve(cwd, 'kubeconfig-devs.json'), JSON.stringify(clusterOutputs.kubeconfig.value, null, 2))
  if (useDirenv) {
    await runCliCmd(`direnv allow .`)
    await runCliCmd('echo export KUBECONFIG=$(pwd)/kubeconfig-devs.json > .envrc')
  } else {
    await runCliCmd('export KUBECONFIG=$(pwd)/kubeconfig-devs.json')
  }
  spinner.succeed(successColor(`Successfully exported kubeconfig for kubectl`))

  // Set up Knative
  const knativeOperatorStackConfigMap = { 'knative_serving_version': { value: '1.0.0' } }
  await pulumiA.stackUp('knative-operator', { createPulumiProgram: () => mainPulumiProgram, configMap: knativeOperatorStackConfigMap })
  await pulumiA.stackUp('knative-serving', { createPulumiProgram: () => mainPulumiProgram })
  await pulumiA.stackUp('knative-eventing', { createPulumiProgram: () => mainPulumiProgram })

  // Set up Istio
  await pulumiA.stackUp('istio', { createPulumiProgram: () => mainPulumiProgram })

  // Setup cert-manager
  const certManagerStackConfigMap = {
    'custom_domain_zone_id': { value: customDomainZoneId },
    'acme_email': { value: acmeEmail },
  }
  await pulumiA.stackUp('cert-manager', { createPulumiProgram: () => mainPulumiProgram, configMap: certManagerStackConfigMap })

  // Setup custom gateway for Knative so that custom Virtual Services can be used
  await pulumiA.stackUp('knative-custom-ingress', { createPulumiProgram: () => mainPulumiProgram })

  // Set up Kube Prometheus Stack (end-to-end k8s monitoring using prometheus, grafana, etc)
  const kubePrometheusStackConfigMap = {
    'grafana_user': { value: grafanaUser },
    'grafana_password': { value: grafanaPassword, secret: true },
  }
  await pulumiA.stackUp('kube-prometheus-stack', { createPulumiProgram: () => mainPulumiProgram, configMap: kubePrometheusStackConfigMap })

  console.info(gradient.pastel(`\n🎉 Successfully created '${projectName}' project!!!\n`))
  console.timeEnd('Done in')
  process.exit(0)
}


program
  .command('app')
  .requiredOption('--aws-region <aws region>', 'aws region; i.e. us-west-1')
  .requiredOption('--pulumi-organization <Pulumi account/organization>', 'name of your Pulumi account (if free plan) or organization (if paid plan)')
  .requiredOption('--custom-domain <custom domain>', 'your custom domain; i.e. your-domain.com')
  .option('--build', 'whether to build/push app to ECR; defaults to false', false)
  .option('--image-url <image url>', 'Docker image url - if --build option is not set, this must be passed in') // TODO: defaults to hello world create react + express app
  .option('--create-db', 'create an RDS instance', false)
  .option('--staging-db-user <staging DB user>', 'AWS RDS postgres db user name; defaults to admin', 'admin')
  .option('--staging-db-password <staging DB user>', 'AWS RDS postgres db password; defaults to adminpass', 'adminpass')
  .option('--prod-db-user <prod DB user>', 'AWS RDS postgres db user name; defaults to admin', 'admin')
  .option('--prod-db-password <prod DB user>', 'AWS RDS postgres db password; defaults to adminpass', 'adminpass')
  .description('create app using Knative')
  .showHelpAfterError('(add --help for additional information)')
  .action(handleApp)

async function handleApp(options: CliOptions) {
  console.info(infoColor('\nCreating app...\n'))
  console.time('Done in')

  // Make options available in other modules
  simpleStore.setState('cliOptions', options)

  const {
    awsRegion,
    pulumiOrganization,
    customDomain,
    imageUrl,
    build,
    createDb,
    stagingDbUser,
    stagingDbPassword,
    prodDbUser,
    prodDbPassword,
  } = options

  /**
   * Run Pulumi Automation scripts to set up Kubernetes and deploy all resources
   */
  const spinner = ora().start(infoColor(`Prepping for Pulumi stack creations...`))

  // Set global pulumi configs (these will run for every pulumi stack up)
  simpleStore.setState('globalPulumiConfigMap', {
    'aws:region': { value: awsRegion },
    'pulumi_organization': { value: pulumiOrganization },
    'custom_domain': { value: customDomain },
  })

  // First set the cli execution context so that mainPulumiProgram will get the stack name from pulumiStackUp func
  simpleStore.setState('cliExecutionContext', 'ckc')

  // Must be imported after the cli execution context and other required states are set
  const mainPulumiProgram = await import('./main')

  const projectName = getProjectName()
  const globalPulumiConfigMap = simpleStore.getState('globalPulumiConfigMap')
  const pulumiA = new PulumiAutomation(projectName, {
    globalConfigMap: globalPulumiConfigMap,
    beforePulumiRun: ({ stackName }) => {
      // Set the current stack so that mainPulumiProgram will have the right stack
      simpleStore.setState('currentStack', stackName)
    },
    afterPulumiRun: async ({ stackName, configMap }) => {
      // Set the globalConfigs and configs in cli as well so that Pulumi can be locally managed (i.e. Pulumi.<stack>.yaml file is filled with right configs)
      await setPulumiConfigsViaCli(pulumiOrganization, stackName, { ...globalPulumiConfigMap, ...configMap })
    },
  })
  spinner.succeed(successColor('Successfully completed prep'))

  /**
   * Create stacks
   * 
   *    NOTE: order matters
   */

  // Build and push app image to ECR
  if (build) {
    await pulumiA.stackUp('app-build', { createPulumiProgram: () => mainPulumiProgram })
  }

  // Create namespaces for staging/prod apps
  await pulumiA.stackUp('app-ns', { createPulumiProgram: () => mainPulumiProgram })

  if (createDb) {
    // Set up staging db and app
    const dbStagingStackConfigMap = {
      'db_user': { value: stagingDbUser },
      'db_password': { value: stagingDbPassword, secret: true },
    }
    await pulumiA.stackUp('db-staging', { createPulumiProgram: () => mainPulumiProgram, configMap: dbStagingStackConfigMap })
  }

  const appStagingStackConfigMap = {
    'imageUrl': { value: imageUrl },
    'db_user': { value: stagingDbUser },
    'db_password': { value: stagingDbPassword, secret: true },
  }
  await pulumiA.stackUp('app-staging', { createPulumiProgram: () => mainPulumiProgram, configMap: appStagingStackConfigMap })

  // Set up prod db and app
  if (createDb) {
    const dbProdStackConfigMap = {
      'db_user': { value: prodDbUser },
      'db_password': { value: prodDbPassword, secret: true },
    }
    await pulumiA.stackUp('db-prod', { createPulumiProgram: () => mainPulumiProgram, configMap: dbProdStackConfigMap })
  }

  const appProdStackConfigMap = {
    'imageUrl': { value: imageUrl },
    'db_user': { value: prodDbUser },
    'db_password': { value: prodDbPassword, secret: true },
  }
  await pulumiA.stackUp('app-prod', { createPulumiProgram: () => mainPulumiProgram, configMap: appProdStackConfigMap })

  console.info(gradient.fruit(`\n🦄 Successfully created app!!!\n`))
  console.timeEnd('Done in')
  process.exit(0)
}


program
  .command('destroy')
  .option('--remove-stacks', 'whether or not stacks should also be removed; defaults to true', true)
  .option('--keep-cluster', 'don\'t remove cluster', false)
  .description('destroy the entire project')
  .showHelpAfterError('(add --help for additional information)')
  .action(handleDestroy)

async function handleDestroy(options: CliOptions) {
  console.info(infoColor('\nDestroying project...\n'))
  console.time('Done in')

  // Make options available in other modules
  simpleStore.setState('cliOptions', options)

  const {
    removeStacks,
    keepCluster,
  } = options

  const projectName = getProjectName()
  const pulumiA = new PulumiAutomation(projectName, {
    afterPulumiRun: async ({ stackName, remove }) => {
      if (remove) {
        try {
          // Remove Pulumi.<stack>.yaml from local setup if the stack is removed
          await fs.unlink(path.resolve(cwd, `Pulumi.${stackName}.yaml`))
        } catch (err) {
          const error = err as any
          // Handle file not found error in case destroy fails in the middle and need to be run again
          if (error.code === 'ENOENT') {
            return
          } else {
            throw new Error(error)
          }
        }
      }
    },
  })

  /**
   * Destroy stacks
   * 
   *    NOTE: Destroy them in reverse order - required because there are dependencies
   */

  // Destroy prod app and db
  await pulumiA.stackDestroy('app-prod', { remove: removeStacks })
  await pulumiA.stackDestroy('db-prod', { remove: removeStacks })

  // Destroy staging app and db
  await pulumiA.stackDestroy('app-staging', { remove: removeStacks })
  await pulumiA.stackDestroy('db-staging', { remove: removeStacks })

  // Destroy app namespaces
  await pulumiA.stackDestroy('app-ns', { remove: removeStacks })

  // Destroy app build
  await pulumiA.stackDestroy('app-build', { remove: removeStacks })

  // Destroy monitoring
  await pulumiA.stackDestroy('kube-prometheus-stack', { remove: removeStacks })

  // Destroy Knative custom gateway
  await pulumiA.stackDestroy('knative-custom-ingress', { remove: removeStacks })

  // Destroy cert-manager
  await pulumiA.stackDestroy('cert-manager', { remove: removeStacks })

  // Destroy Istio
  await pulumiA.stackDestroy('istio', { remove: removeStacks })

  // Destroy Knative
  // NOTE: must destroy knative-serving/knative-eventing stacks before destroying knative-operator
  await pulumiA.stackDestroy('knative-eventing', { remove: removeStacks })
  await pulumiA.stackDestroy('knative-serving', { remove: removeStacks })
  await pulumiA.stackDestroy('knative-operator', { remove: removeStacks })

  if (!keepCluster) {
    // Destroy cluster autoscaler
    await pulumiA.stackDestroy('cluster-autoscaler', { remove: removeStacks })
    await pulumiA.stackDestroy('cluster', { remove: removeStacks })
  }

  console.info(gradient.fruit(`\n💥 Successfully destroyed '${projectName}' project\n`))
  console.timeEnd('Done in')
  process.exit(0)
}

program
  .parseAsync()
