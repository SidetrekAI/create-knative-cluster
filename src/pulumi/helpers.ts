import * as fs from 'fs'
import * as path from 'path'
import * as chalk from 'chalk'
import { PulumiConfig } from './types'

const yaml = require('js-yaml')
const cwd = process.cwd() // dir where the cli is run (i.e. project root)

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

export const runCliCmd = (cmd: string) => {
  const { execSync } = require('child_process')
  const stdout = execSync(cmd)
  return stdout
}

export const getPrefixedStackName = (orgName: string, stackName: string) => {
  return `${orgName}/${stackName}`
}

export const getQualifiedStackName = (orgName: string, stackName: string) => {
  const projectName = getProjectName()
  return `${orgName}/${projectName}/${stackName}`
}

export const createPulumiStack = (orgName: string, stackName: string) => {
  const prefixedStackName = getPrefixedStackName(orgName, stackName)
  try {
    runCliCmd(`pulumi stack init ${prefixedStackName}`)
  } catch (err) {
    const errorMessage = (err as Error).toString()
    if (errorMessage.includes('already exists')) {
      return
    } else {
      throw new Error(errorMessage)
    }
  }
}

export const createPulumiStacks = (orgName: string, stackNames: string[]) => {
  stackNames.forEach(stackName => createPulumiStack(orgName, stackName))
}

export const runPulumiStackCmd = (orgName: string, stackName: string, cmd: string) => {
  const prefixedStackName = getPrefixedStackName(orgName, stackName)
  runCliCmd(`pulumi stack select ${prefixedStackName} && ${cmd}`)
}

export const setPulumiConfig = (orgName: string, stackName: string, config: PulumiConfig) => {
  const { key, configValue } = config
  const { value, secret } = configValue
  runPulumiStackCmd(orgName, stackName, `pulumi config set ${key} ${value}${secret ? ' --secret' : ''}`)
}

let pulumiOutputsState: object = {}
export let pulumiOutputsStore: any = {
  set: (outputs: object) => {
    pulumiOutputsState = { ...pulumiOutputsState, ...outputs }
  },
  get: () => {
    return pulumiOutputsState
  },
}

export const getAwsAccountId = () => {
  const stdout = runCliCmd(`aws sts get-caller-identity`)
  return JSON.parse(stdout.toString()).Account
}