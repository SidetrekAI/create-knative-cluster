import * as fs from 'fs'
import { Command } from 'commander'
import { runPulumiStack } from './automation'
import { CliOptions, PulumiAutomationScriptArgs } from './types'

const cliProgram = new Command()
cliProgram
  // .requiredOption('-p, --project-name <projectName>', 'Pulumi project name')
  // .requiredOption('-s, --stack-name <stackName>', 'Pulumi stack name')
  .requiredOption('-f, --automation-script-path <automationScriptPath>', 'absolute path to Pulumi automation script file')
  .option('-d, --destroy <destroy>', 'destroy Pulumi stack')
  .option('-i, --input-path <inputPath>', 'absolute path to JSON inputs file from another stack run')

cliProgram.parse(process.argv)
const options: CliOptions = cliProgram.opts()
const { automationScriptPath, destroy: destroyOpt, inputPath } = options
const destroy = destroyOpt.toLowerCase() === 'true'
const inputs = inputPath ? JSON.parse(fs.readFileSync(inputPath, 'utf-8')) : undefined
console.log('inputs', inputs)

const pulumiAutomationScript: PulumiAutomationScriptArgs = require(automationScriptPath)
runPulumiStack({ ...pulumiAutomationScript, inputs, destroy })