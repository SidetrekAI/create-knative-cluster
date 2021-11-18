import * as fs from 'fs'
import * as path from 'path'
import * as chalk from 'chalk'
import * as k8s from '@pulumi/kubernetes'
import { PulumiConfig } from './types'

const yaml = require('js-yaml')

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

let globalConfigState: any[] = []
export let globalConfigs: any = {
  set: (config: PulumiConfig) => {
    return globalConfigState.push(config)
  },
  get: () => {
    return globalConfigState
  },
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

export const getK8sProvider = (clusterName: string, kubeconfig: string) => {
  return new k8s.Provider(`${clusterName}-provider`, { kubeconfig })
}

export const runCliCmd = (cmd: string) => {
  const { execSync } = require('child_process')
  const stdout = execSync(cmd)
  return stdout
}