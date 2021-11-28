import * as path from 'path'
import * as dotenv from 'dotenv'
import * as pulumi from '@pulumi/pulumi'
import * as awsx from '@pulumi/awsx'
import * as knative from '../k8s_crds/knative-serving'
import { KnativeVirtualService } from '../component-resources'

dotenv.config({ path: path.resolve(__dirname, '../../frontend', '.env') })

export interface AppBuildStackArgs {
  project: string,
}

export class AppBuildStack extends pulumi.ComponentResource {
  imageUrl: pulumi.Output<string>

  constructor(name: string, args: AppBuildStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:AppBuildStack', name, {}, opts)

    const {
      project,
    } = args

    const projectRootDir = path.resolve(__dirname, '../../')

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