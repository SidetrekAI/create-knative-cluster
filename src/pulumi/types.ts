import { ConfigValue, PulumiFn } from '@pulumi/pulumi/automation'

export interface PulumiConfig {
  key: string,
  configValue: ConfigValue,
}

export interface PulumiPlugin {
  name: string,
  version: string,
  kind?: string,
}