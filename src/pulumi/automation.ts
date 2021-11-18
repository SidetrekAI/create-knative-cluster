import { InlineProgramArgs, LocalWorkspace } from '@pulumi/pulumi/automation'
import { PulumiRunArgs } from './types'
import { PulumiProgramArgs, PulumiStackOptions } from './types'
import { getColor, getProjectName, globalConfigs } from './helpers'

const infoColor = getColor('info')
const successColor = getColor('success')
const errorColor = getColor('error')
const outputColor = getColor('output')

const defaultProject = getProjectName()

export const pulumiStackUp = (stack: string, programArgs: PulumiProgramArgs, options?: PulumiStackOptions) => {
  const { createPulumiProgram, plugins, configs = [] } = programArgs
  const { project, inputs = [] } = options || {}
  
  const program = createPulumiProgram(inputs)

  const projectName = project || defaultProject

  return pulumiRun({
    projectName,
    stackName: stack,
    program,
    plugins,
    configs: [...configs, ...globalConfigs.get()],
    options: { destroy: false },
  })
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
      await Promise.all(plugins.map(async ({ name, version, kind }) => {
        if (kind) {
          await stack.workspace.installPlugin(name, version, kind)
        } else {
          await stack.workspace.installPlugin(name, version)
        }
      }))
      console.info(successColor('Plugins installed\n'))
    }

    if (Array.isArray(configs) && configs.length > 0) {
      console.info(infoColor('Setting up config\n'))
      await Promise.all(configs.map(async ({ key, configValue }) => {
        await stack.setConfig(key, configValue)
      }))
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
    process.exitCode = 1
    return {}
  }
}