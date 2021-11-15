import { PulumiFn, ConfigValue } from '@pulumi/pulumi/automation'

export interface CliOptions {
  projectName: string,
  stackName: string,
  automationScriptPath: string,
  destroy: string,
  inputPath: string,
}

export interface PluginArgs {
  name: string,
  version: string,
  kind?: string,
}

export interface ConfigArgs {
  key: string,
  configValue: ConfigValue,
}

export type CreatePulumiFn = (inputs?: any) => PulumiFn

export interface PulumiAutomationScriptArgs {
  project: string,
  stack: string,
  createPulumiProgram: CreatePulumiFn,
  plugins?: PluginArgs[],
  configs?: ConfigArgs[],
}

export interface RunStackArgs {
  project: string,
  stack: string,
  createPulumiProgram: CreatePulumiFn,
  plugins?: PluginArgs[],
  configs?: ConfigArgs[],
  inputs?: any,
  destroy?: boolean,
}

export interface RunArgs {
  project: string,
  stack: string,
  program: PulumiFn,
  plugins?: PluginArgs[],
  configs?: ConfigArgs[],
  destroy?: boolean,
}

export interface PulumiStackUpOptions {
  plugins?: PluginArgs[],
  configs?: ConfigArgs[],
}

export interface PulumiStackUpArgs {
  project: string,
  stack: string,
  program: string,
  options?: PulumiStackUpOptions,
}