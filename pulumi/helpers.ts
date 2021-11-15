import { PulumiStackUpArgs } from "./types"

export const pulumiStackUp = ({
  project,
  stack,
  program,
  options: { configs, plugins } = {}
}: PulumiStackUpArgs) => {
  return {
    project,
    stack,
    createPulumiProgram: program,
    configs,
    plugins,
  }
}