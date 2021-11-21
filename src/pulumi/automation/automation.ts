import { InlineProgramArgs, LocalWorkspace, PulumiFn } from '@pulumi/pulumi/automation'
import { PulumiConfig, PulumiPlugin } from '../types'
import {
  currentStack,
  getColor,
  getProjectName,
  globalPulumiConfigs,
} from '../helpers'

const infoColor = getColor('info')
const successColor = getColor('success')
const errorColor = getColor('error')
const outputColor = getColor('output')

export type CreatePulumiFn = (inputs: any[]) => PulumiFn

export interface PulumiProgramArgs {
  createPulumiProgram: CreatePulumiFn,
  plugins?: PulumiPlugin[],
  configs?: PulumiConfig[],
}

export interface PulumiStackOptions {
  inputs?: any[],
}

export interface PulumiAutomationOptions {
  globalConfigs?: PulumiConfig[],
  beforePulumiRun?: (stack: string) => any,
}

export class PulumiAutomation {
  project: string
  options: PulumiAutomationOptions

  constructor(project: string, options: PulumiAutomationOptions = {}) {
    this.project = project
    this.options = options
  }

  stackUp(stack: string, programArgs: PulumiProgramArgs, options?: PulumiStackOptions) {
    const { globalConfigs = [], beforePulumiRun } = this.options
    const { createPulumiProgram, plugins = [], configs = [] } = programArgs
    const { inputs = [] } = options || {}

    const program = createPulumiProgram(inputs)

    beforePulumiRun && beforePulumiRun(stack)

    return pulumiRun({
      projectName: this.project,
      stackName: stack,
      program,
      plugins,
      configs: [...configs, ...globalConfigs],
      options: { destroy: false },
    })
  }
}



// export const pulumiStackUp = (stack: string, programArgs: PulumiProgramArgs, options?: PulumiStackOptions) => {
//   const { createPulumiProgram, plugins, configs = [] } = programArgs
//   const { project, inputs = [] } = options || {}

//   const program = createPulumiProgram(inputs)

//   // Set the currentStack so that mainPulumiProgram will have it
//   currentStack.set(stack)

//   const projectName = project || defaultProject

//   const globalConfigs = globalPulumiConfigs.get()
//   console.log('globalConfigs', globalConfigs)

//   return pulumiRun({
//     projectName,
//     stackName: stack,
//     program,
//     plugins,
//     configs: [...configs, ...globalConfigs],
//     options: { destroy: false },
//   })
// }

export interface PulumiRunOptions {
  destroy?: boolean,
}

export interface PulumiRunArgs {
  projectName: string,
  stackName: string,
  program: PulumiFn,
  plugins?: PulumiPlugin[],
  configs?: PulumiConfig[],
  options?: PulumiRunOptions,
}

export const pulumiRun = async ({
  projectName,
  stackName,
  program,
  plugins,
  configs,
  options: {
    destroy = false,
  } = {},
}: PulumiRunArgs) => {
  try {
    const args: InlineProgramArgs = {
      projectName,
      stackName,
      program,
    }
    const stack = await LocalWorkspace.createOrSelectStack(args)
    console.info(successColor(`Successfully initialized '${stackName}' stack\n`))

    if (Array.isArray(plugins) && plugins.length > 0) {
      console.info(infoColor('Installing plugins...\n'))
      const pluginPromises = plugins.map(({ name, version, kind }) => {
        return stack.workspace.installPlugin(name, version, kind)
      })
      await Promise.all(pluginPromises)
      console.info(successColor('Plugins installed\n'))
    }

    console.log('configs inside Pulumi Run...', configs)
    if (Array.isArray(configs) && configs.length > 0) {
      console.info(infoColor('Setting up config\n'))
      const configPromises = configs.map(({ key, configValue }) => {
        return stack.setConfig(key, configValue)
      })
      await Promise.all(configPromises)
      console.info(successColor('Config set\n'))
    }

    console.info(infoColor(`Refreshing '${stackName}' stack...\n`))
    await stack.refresh({ onOutput: console.info })
    console.info(successColor('Refresh complete\n'))

    if (destroy) {
      console.info(infoColor(`Destroying stack...\n`))
      await stack.destroy({ onOutput: console.info })
      console.info(successColor('Stack destroy complete\n'))
      process.exit(0)
    }

    console.info(infoColor(`Updating '${stackName}' stack...\n`))
    const upRes = await stack.up({ onOutput: console.info })
    console.log(successColor(`Update summary for '${stackName}' stack: \n${JSON.stringify(upRes.summary.resourceChanges, null, 4)}\n`))
    console.log(outputColor(`Outputs: \n${JSON.stringify(upRes.outputs, null, 4)}\n`))
    return upRes.outputs
  } catch (err) {
    console.log(errorColor(err))
    process.exit(1)
  }
}