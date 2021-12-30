import * as pulumi from '@pulumi/pulumi'
import { Emissary, EmissaryListener, CertManagerCertificate } from '../component-resources/cluster-svc'

interface EmissaryStackArgs {
  emissaryNamespaceName: string,
  hostname: string,
  rootDomainTlsSecretName: string,
  subdomainWildcardTlsSecretName: string,
}

export class EmissaryStack extends pulumi.ComponentResource {
  constructor(name: string, args: EmissaryStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:EmissaryStack', name, {}, opts)

    const {
      emissaryNamespaceName,
      hostname,
      rootDomainTlsSecretName,
      subdomainWildcardTlsSecretName,
    } = args

    const emissary = new Emissary('emissary', {
      emissaryNamespaceName,
    }, { parent: this })

    const emissaryListener = new EmissaryListener(`emissary-listener`, {
      namespace: emissaryNamespaceName,
    }, { parent: this, dependsOn: [emissary] })

    /**
     * Issue a Certificate for root domain
     */
    const rootDomainCert = new CertManagerCertificate('root-domain-cert', {
      namespace: emissaryNamespaceName,
      dnsName: hostname,
      tlsSecretName: rootDomainTlsSecretName,
    }, { parent: this })

    /**
     * Issue a Certificate for wildcard subdomains
     */
    const subdomainWildcardCert = new CertManagerCertificate('subdomain-wildcard-cert', {
      namespace: emissaryNamespaceName,
      dnsName: `*.${hostname}`,
      tlsSecretName: subdomainWildcardTlsSecretName,
    }, { parent: this })

    this.registerOutputs()
  }
}