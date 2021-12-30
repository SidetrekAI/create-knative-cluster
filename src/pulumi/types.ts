import * as awsx from '@pulumi/awsx'

export interface PulumiPlugin {
  name: string,
  version: string,
  kind?: string,
}