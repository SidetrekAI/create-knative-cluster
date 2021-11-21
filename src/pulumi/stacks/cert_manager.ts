import * as pulumi from '@pulumi/pulumi'
import { CertManager, WildcardCertificate } from '../component_resources'

export interface CertManagerStackArgs {
  awsAccountId: string,
  awsRegion: string,
  hostedZoneId: string,
  customDomain: string,
  eksHash: string,
  acmeEmail: string,
}

export class CertManagerStack extends pulumi.ComponentResource {
  constructor(name: string, args: CertManagerStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:CertManagerStack', name, {}, opts)

    const {
      awsAccountId,
      awsRegion,
      hostedZoneId,
      customDomain,
      eksHash,
      acmeEmail,
    } = args

    /**
     * Install cert-manager for TLS certificates
     */
    const certManager = new CertManager('cert-manager', {
      awsAccountId,
      awsRegion,
      hostedZoneId,
      customDomain,
      eksHash,
      acmeEmail,
    }, { parent: this })

    this.registerOutputs()
  }
}