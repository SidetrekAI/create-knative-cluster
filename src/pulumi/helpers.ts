import * as fs from 'fs'
import * as path from 'path'
import * as chalk from 'chalk'
import * as k8s from '@pulumi/kubernetes'
import { PulumiConfig } from './types'
import { PULUMI_GENERATED_STACK_OUTPUTS_PATH } from './constants'

const yaml = require('js-yaml')
const cwd = process.cwd() // dir where the cli is run (i.e. project root)

let cliExecutionContextState: string = 'pulumi'
export const cliExecutionContext: any = {
  set: (ctx: string) => cliExecutionContextState = ctx,
  get: () => cliExecutionContextState
}

let currentStackState: string = ''
export const currentStack: any = {
  set: (stackName: string) => currentStackState = stackName,
  get: () => currentStackState,
}

export const getProjectName = () => {
  const cwd = process.cwd() // dir where the cli is run (i.e. project root)
  const pulumiYamlFile = path.resolve(cwd, 'Pulumi.yaml')

  if (!fs.existsSync(pulumiYamlFile)) {
    console.log('error: Pulumi project file "Pulumi.yaml" is not found in project root. You must first create a Pulumi project.')
    process.exitCode = 1
  } else {
    const pulumiYaml = yaml.load(fs.readFileSync(pulumiYamlFile, 'utf8'))
    const projectName = pulumiYaml.name
    return projectName
  }
}

interface ColorMap {
  [key: string]: chalk.Chalk
}

export const getColor = (color: string) => {
  const themes: ColorMap = {
    info: chalk.bold.cyanBright,
    success: chalk.bold.green,
    output: chalk.bold.rgb(194, 195, 255),
    error: chalk.bold.red,
    warning: chalk.keyword('orange'),
  }
  return themes[color]
}

let cliOptionsState: object = {}
export let cliOptionsStore: any = {
  set: (options: object) => {
    cliOptionsState = options
  },
  get: () => {
    return cliOptionsState
  },
}

export const runCliCmd = (cmd: string) => {
  const { execSync } = require('child_process')
  const stdout = execSync(cmd)
  return stdout
}

export const getPrefixedStackName = (stackName: string) => {
  const { pulumiOrganization } = cliOptionsStore.get()
  return pulumiOrganization ? `${pulumiOrganization}/${stackName}` : `${stackName}`
}

export const getQualifiedStackName = (stackName: string) => {
  const { pulumiOrganization } = cliOptionsStore.get()
  const projectName = getProjectName()
  return `${pulumiOrganization}/${projectName}/${stackName}`
}

export const createPulumiStack = (stackName: string) => {
  const qualifiedStackName = getPrefixedStackName(stackName)
  try {
    runCliCmd(`pulumi stack init ${qualifiedStackName}`)
  } catch (err) {
    const errorMessage = (err as Error).toString()
    if (errorMessage.includes('already exists')) {
      return
    } else {
      throw new Error(errorMessage)
    }
  }
}

export const createPulumiStacks = (stackNames: string[]) => {
  stackNames.forEach(stackName => createPulumiStack(stackName))
}

export const runPulumiStackCmd = (stackName: string, cmd: string) => {
  const qualifiedStackName = getPrefixedStackName(stackName)
  runCliCmd(`pulumi stack select ${qualifiedStackName} && ${cmd}`)
}

export const runPulumiUp = (stackName: string) => {
  runPulumiStackCmd(stackName, `pulumi up --yes`)
  const outputs = saveStackOutputs(stackName)
  return outputs
}

export const saveStackOutputs = (stackName: string) => {
  runPulumiStackCmd(stackName, `pulumi stack output --json > ${PULUMI_GENERATED_STACK_OUTPUTS_PATH}/${stackName}.json`)
  return loadStackOutputs(stackName)
}

export const loadStackOutputs = (stackName: string) => {
  return require(path.resolve(cwd, `${PULUMI_GENERATED_STACK_OUTPUTS_PATH}/${stackName}.json`))
}

// export const createAndRunPulumiStack = (stackName: string) => {
//   createPulumiStack(stackName)

//   // Set any global pulumi configs
//   const globalConfigs = globalPulumiConfigs.get()
//   globalConfigs.forEach(config => setPulumiConfig(stackName, config))

//   // pulumi up
//   const outputs = runPulumiUp(stackName)
//   return outputs
// }

let globalPulumiConfigsState: any[] = []
export const globalPulumiConfigs = {
  set: (configs: PulumiConfig[]) => {
    globalPulumiConfigsState = configs
  },
  get: () => {
    return globalPulumiConfigsState
  }
}

export const setPulumiConfig = (stackName: string, config: PulumiConfig) => {
  const { key, configValue } = config
  const { value, secret } = configValue
  runPulumiStackCmd(stackName, `pulumi config set ${key} ${value}${secret ? ' --secret' : ''}`)
}

let pulumiOutputsState: object = {}
export let pulumiOutputsStore: any = {
  set: (outputs: object) => {
    console.log('outputs in pulumiOutputsStore', outputs)
    console.log('result', { ...pulumiOutputsState, ...outputs })
    pulumiOutputsState = { ...pulumiOutputsState, ...outputs }
  },
  get: () => {
    return pulumiOutputsState
  },
}