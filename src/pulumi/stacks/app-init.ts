import * as pulumi from '@pulumi/pulumi'
import * as k8s from '@pulumi/kubernetes'

export interface AppInitStackArgs {
  appNamespaceName: string,
  developerClusterRole: k8s.rbac.v1.ClusterRole,
}

export class AppInitStack extends pulumi.ComponentResource {
  appNamespace: k8s.core.v1.Namespace

  constructor(name: string, args: AppInitStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:stack:AppInitStack', name, {}, opts)

    const {
      appNamespaceName,
      developerClusterRole,
    } = args

    const appNamespace = new k8s.core.v1.Namespace(appNamespaceName, {
      metadata: { name: appNamespaceName }
    }, { parent: this })

    const developerK8sRoleBindingName = `developer-binding-${appNamespaceName}`
    new k8s.rbac.v1.RoleBinding(developerK8sRoleBindingName, {
      metadata: {
        name: developerK8sRoleBindingName,
        namespace: appNamespace.metadata.name,
      },
      subjects: [{
        kind: 'User',
        name: 'developer-user',
        apiGroup: 'rbac.authorization.k8s.io',
      }],
      roleRef: {
        kind: 'ClusterRole',
        name: developerClusterRole.metadata.name,
        apiGroup: 'rbac.authorization.k8s.io',
      },
    }, { parent: this })

    this.appNamespace = appNamespace

    this.registerOutputs()
  }
}