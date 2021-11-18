import { PulumiFn, ConfigValue } from '@pulumi/pulumi/automation'

export interface PulumiPlugin {
  name: string,
  version: string,
  kind?: string,
}

export interface PulumiConfig {
  key: string,
  configValue: ConfigValue,
}

export type CreatePulumiFn = (inputs: any[]) => PulumiFn

export interface PulumiProgramArgs {
  createPulumiProgram: CreatePulumiFn,
  plugins?: PulumiPlugin[],
  configs?: PulumiConfig[],
}

export interface PulumiStackOptions {
  project?: string,
  inputs?: any[],
  providers?: any[],
}

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
