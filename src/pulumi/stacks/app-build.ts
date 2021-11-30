import * as path from 'path'
import * as dotenv from 'dotenv'
import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'

export interface AppBuildStackArgs {
  projectRootDir: string,
  project: string,
}

export class AppBuildStack extends pulumi.ComponentResource {
  imageUrl: pulumi.Output<string>

  constructor(name: string, args: AppBuildStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:AppBuildStack', name, {}, opts)

    const {
      projectRootDir,
      project,
    } = args

    dotenv.config({ path: path.resolve(__dirname, projectRootDir, 'frontend', '.env') })

    /**
     * Build and push images to ECR
     */

    // Unique to React Apps
    // Must provide frontend env variables (i.e. REACT_APP_*) since it's not present during Github Actions CD (i.e. .env is not checked into the repo)
    const frontendEnvs = {
    }
    const appImage = awsx.ecr.buildAndPushImage(`${project}-app-image`, {
      context: projectRootDir,
      dockerfile: './Dockerfile.prod',
      ...Object.keys(frontendEnvs).length === 0 ? {} : { args: frontendEnvs },
    })

    this.imageUrl = pulumi.output(appImage.image())

    this.registerOutputs()
  }
}