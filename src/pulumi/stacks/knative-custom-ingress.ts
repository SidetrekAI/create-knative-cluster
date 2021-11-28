import * as pulumi from '@pulumi/pulumi'
import { WildcardCertificate, KnativeHttpsIngressGateway } from '../component-resources'

export interface KnativeCustomIngressStackArgs {
  customDomain: string,
  knativeHttpsIngressGatewayName: string,
}

export class KnativeCustomIngressStack extends pulumi.ComponentResource {
  constructor(name: string, args: KnativeCustomIngressStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:KnativeCustomIngressStack', name, {}, opts)

    const {
      customDomain,
      knativeHttpsIngressGatewayName,
    } = args

    /**
     * Issue a wild card certificate for *.[custom doman] instead of using namespace specific certs created by knative
     * 
     * This is used for the common ingress gateway (i.e. knative-https-ingress-gateway) in knative-serving ns so that
     * VirtualService can be used to route traffic from external sources using https (tls)
     * 
     * GOTCHA: Wildcard certificate needs to be created in istio-system ns to take effect even though knative-https-ingress-gateway
     * is in knative-serving ns -> because underneath it uses the istio-ingressgateway in istio-system ns
     */
    const wildcardCertName = 'wildcard-certificate'
    const wildcardCertificateSecretName = 'wildcard-certificate'
    const wildcardCert = new WildcardCertificate(wildcardCertName, {
      customDomain,
      wildcardCertificateSecretName,
    }, { parent: this })

    /**
     * Replace the knative-ingress-gateway gateway to allow for https and use custom VirtualService to route traffic
     */
    const knativeHttpsIngressGateway = new KnativeHttpsIngressGateway(knativeHttpsIngressGatewayName, {
      customDomain,
      knativeHttpsIngressGatewayName,
      wildcardCertificateSecretName,
    }, { parent: this })

    this.registerOutputs()
  }
}