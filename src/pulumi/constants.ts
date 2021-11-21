import * as path from 'path'

const cwd = process.cwd() // dir where the cli is run (i.e. project root)

export const PULUMI_GENERATED_STACK_OUTPUTS_PATH = path.resolve(cwd, './pulumi/generated/outputs')