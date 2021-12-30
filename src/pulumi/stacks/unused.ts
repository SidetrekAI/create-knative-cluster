// import * as pulumi from '@pulumi/pulumi'
// import {
//   ClusterAutoscaler,
//   KnativeOperator,
//   KnativeServing,
//   KnativeEventing,
//   WildcardCertificate,
//   KnativeHttpsIngressGateway,
// } from '../component-resources/unused'

// export interface ClusterAutoscalerStackArgs {
//   awsAccountId: string,
//   awsRegion: string,
//   clusterName: pulumi.Output<string>,
//   eksHash: pulumi.Output<string>,
// }

// export class ClusterAutoscalerStack extends pulumi.ComponentResource {
//   constructor(name: string, args: ClusterAutoscalerStackArgs, opts?: pulumi.ComponentResourceOptions) {
//     super('custom:stack:ClusterAutoscalerStack', name, {}, opts)

//     const {
//       awsAccountId,
//       awsRegion,
//       clusterName,
//       eksHash,
//     } = args

//     const clusterAutoscaler = new ClusterAutoscaler('cluster-autoscaler', {
//       awsAccountId,
//       awsRegion,
//       clusterName,
//       eksHash,
//     }, { parent: this })

//     this.registerOutputs()
//   }
// }

// export interface KnativeCustomIngressStackArgs {
//   hostname: string,
//   knativeHttpsIngressGatewayName: string,
// }

// export class KnativeCustomIngressStack extends pulumi.ComponentResource {
//   constructor(name: string, args: KnativeCustomIngressStackArgs, opts?: pulumi.ComponentResourceOptions) {
//     super('custom:stack:KnativeCustomIngressStack', name, {}, opts)

//     const {
//       hostname,
//       knativeHttpsIngressGatewayName,
//     } = args

//     /**
//      * Issue a wild card certificate for *.[custom doman] instead of using namespace specific certs created by knative
//      * 
//      * This is used for the common ingress gateway (i.e. knative-https-ingress-gateway) in knative-serving ns so that
//      * VirtualService can be used to route traffic from external sources using https (tls)
//      * 
//      * GOTCHA: Wildcard certificate needs to be created in istio-system ns to take effect even though knative-https-ingress-gateway
//      * is in knative-serving ns -> because underneath it uses the istio-ingressgateway in istio-system ns
//      */
//     const wildcardCertName = 'wildcard-certificate'
//     const wildcardCertificateSecretName = 'wildcard-certificate'
//     const wildcardCert = new WildcardCertificate(wildcardCertName, {
//       hostname,
//       wildcardCertificateSecretName,
//     }, { parent: this })

//     /**
//      * Replace the knative-ingress-gateway gateway to allow for https and use custom VirtualService to route traffic
//      */
//     const knativeHttpsIngressGateway = new KnativeHttpsIngressGateway(knativeHttpsIngressGatewayName, {
//       hostname,
//       knativeHttpsIngressGatewayName,
//       wildcardCertificateSecretName,
//     }, { parent: this })

//     this.registerOutputs()
//   }
// }

// export interface KnativeOperatorStackArgs {
//   knativeServingVersion: string,
// }

// export class KnativeOperatorStack extends pulumi.ComponentResource {
//   constructor(name: string, args: KnativeOperatorStackArgs, opts?: pulumi.ComponentResourceOptions) {
//     super('custom:stack:KnativeOperatorStack', name, {}, opts)

//     const { knativeServingVersion } = args
//     console.log('knativeServingVersion', knativeServingVersion)

//     const knativeOperator = new KnativeOperator('knative-operator', {
//       version: knativeServingVersion,
//     }, { parent: this })

//     this.registerOutputs()
//   }
// }

// export interface KnativeServingStackArgs {
//   hostname: string,
//   knativeHttpsIngressGatewayName: string,
// }

// export class KnativeServingStack extends pulumi.ComponentResource {
//   constructor(name: string, args: KnativeServingStackArgs, opts?: pulumi.ComponentResourceOptions) {
//     super('custom:stack:KnativeServingStack', name, {}, opts)

//     const {
//       hostname,
//       knativeHttpsIngressGatewayName,
//     } = args

//     const knativeServing = new KnativeServing('knative-serving', {
//       hostname,
//       knativeHttpsIngressGatewayName,
//     }, { parent: this })

//     this.registerOutputs()
//   }
// }

// export interface KnativeEventingStackArgs {
// }

// export class KnativeEventingStack extends pulumi.ComponentResource {
//   constructor(name: string, args: KnativeEventingStackArgs, opts?: pulumi.ComponentResourceOptions) {
//     super('custom:stack:KnativeEventingStack', name, {}, opts)

//     const { } = args

//     const knativeEventing = new KnativeEventing('knative-eventing', {}, { parent: this })

//     this.registerOutputs()
//   }
// }