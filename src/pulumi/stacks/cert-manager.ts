import * as pulumi from '@pulumi/pulumi'
import { CertManager, CertManagerCertificate } from '../component-resources/cluster-svc'

export interface CertManagerStackArgs {
  project: string,
  awsAccountId: string,
  awsRegion: string,
  hostedZoneId: string,
  hostname: string,
  eksHash: pulumi.Output<string>,
  acmeEmail: string,
}

export class CertManagerStack extends pulumi.ComponentResource {
  constructor(name: string, args: CertManagerStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:CertManagerStack', name, {}, opts)

    const {
      project,
      awsAccountId,
      awsRegion,
      hostedZoneId,
      hostname,
      eksHash,
      acmeEmail,
    } = args

    // Install cert-manager for TLS certificates
    const certManager = new CertManager('cert-manager', {
      project,
      awsAccountId,
      awsRegion,
      hostedZoneId,
      hostname,
      eksHash,
      acmeEmail,
    }, { parent: this })

    this.registerOutputs()
  }
}