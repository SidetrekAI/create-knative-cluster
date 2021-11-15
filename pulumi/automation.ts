import { InlineProgramArgs, LocalWorkspace } from '@pulumi/pulumi/automation'
import { RunArgs } from './types'
import { RunStackArgs } from './types'

export const runPulumiStack = (args: RunStackArgs) => {
  const { createPulumiProgram, inputs, ...rest } = args
  const program = inputs ? createPulumiProgram(inputs) : createPulumiProgram()

  return run({
    program,
    ...rest,
  })
}

export const run = async ({
  destroy = false,
  project: projectName,
  stack: stackName,
  program,
  plugins,
  configs,
}: RunArgs) => {

  // Create our stack 
  const args: InlineProgramArgs = {
    projectName,
    stackName,
    program,
  }
  const stack = await LocalWorkspace.createOrSelectStack(args)
  console.info(`successfully initialized stack '${stackName}'`)

  if (plugins) {
    console.info('installing plugins...')
    await Promise.all(plugins.map(async ({ name, version, kind }) => {
      if (kind) {
        await stack.workspace.installPlugin(name, version, kind)
      } else {
        await stack.workspace.installPlugin(name, version)
      }
    }))
    console.info('plugins installed')
  }

  if (configs) {
    console.info('setting up config')
    await Promise.all(configs.map(async ({ key, configValue }) => {
      await stack.setConfig(key, configValue)
    }))
    console.info('config set')
  }

  console.info('refreshing stack...')
  await stack.refresh({ onOutput: console.info })
  console.info('refresh complete')

  if (destroy) {
    console.info('destroying stack...')
    await stack.destroy({ onOutput: console.info })
    console.info('stack destroy complete')
    process.exit(0)
  }

  console.info('updating stack...')
  const upRes = await stack.up({ onOutput: console.info })
  console.log(`update summary: \n${JSON.stringify(upRes.summary.resourceChanges, null, 4)}`)
  console.log(`${JSON.stringify({ [stackName]: upRes.outputs })}`)
}