#!/usr/bin/env python -B

from pathlib import Path
import typer
from prefect import Flow, case
import stack
from tasks import (
    get_project_name,
    pulumi_stack_up,
    run_shell_cmd,
    check_k8s_resource_ready,
)
from helpers import view_task_results

app = typer.Typer()
app.add_typer(stack.app, name="stack")


@app.command("init")
def init():
    """
    Usage example:
        create-knative-cluster init
    """
    cwd = Path().resolve()  # absolute path where the create-knative-cluster cmd is run
    pulumi_stacks_path = (cwd / "pulumi/stacks").resolve()

    with Flow("pulumi-flow") as flow:
        """
        Deploy Pulumi stacks
        """
        project_name_output = get_project_name()
        cluster_output = pulumi_stack_up("cluster", (pulumi_stacks_path / "cluster.ts").resolve(), [project_name_output])
        cluster_ready = check_k8s_resource_ready("check-cluster-ready", "kubectl get svc")

        # # Make sure the cluster is available from here on
        # with case(cluster_ready, True):

        # istio_operator_output = run_shell_cmd("install-istio-operator", "$HOME/.istioctl/bin/istioctl operator init")
        # istio_operator_ready = check_k8s_resource_ready("check-istio-operator-ready", "kubectl get svc -n istio-operator")

        # # Make sure Istio Operator is available from here on
        # with case(istio_operator_ready, True):
        #     app_ns_output = pulumi_stack_up("app_ns", (pulumi_stacks_path / "app_ns.ts").resolve())
        #     cluster_autoscaler_output = pulumi_stack_up("cluster_autoscaler", (pulumi_stacks_path / "cluster_autoscaler.ts").resolve(), [cluster_output])
        #     knative_operator_output = pulumi_stack_up("knative_operator", (pulumi_stacks_path / "knative_operator.ts").resolve(), [cluster_output])
        #     knative_serving_output = pulumi_stack_up("knative_serving", (pulumi_stacks_path / "knative_serving.ts").resolve(), [cluster_output])
        #     knative_eventing_output = pulumi_stack_up("knative_eventing", (pulumi_stacks_path / "knative_eventing.ts").resolve(), [cluster_output])
        #     cert_manager_output = pulumi_stack_up("cert_manager", (pulumi_stacks_path / "cert_manager.ts").resolve(), [cluster_output])
        #     knative_custom_ingress_output = pulumi_stack_up("knative_custom_ingress", (pulumi_stacks_path / "knative_custom_ingress.ts").resolve(), [cluster_output])
        #     kube_prometheus_stack_output = pulumi_stack_up("kube_prometheus_stack", (pulumi_stacks_path / "kube_prometheus_stack.ts").resolve(), [cluster_output])
        #     app_svc_staging_output = pulumi_stack_up("app_svc_staging", (pulumi_stacks_path / "app_svc_staging.ts").resolve(), [cluster_output])
        #     app_staging_output = pulumi_stack_up("app_staging", (pulumi_stacks_path / "app_staging.ts").resolve(), [cluster_output])
        #     app_svc_prod_output = pulumi_stack_up("app_svc_prod", (pulumi_stacks_path / "app_svc_prod.ts").resolve(), [cluster_output])
        #     app_prod_output = pulumi_stack_up("app_prod", (pulumi_stacks_path / "app_prod.ts").resolve(), [cluster_output])

    state = flow.run()

    # View task results
    task_results_to_view = [
        "get_project_name",
        "cluster",
        "install_istio_operator",
    ]
    view_task_results(flow, state, task_results_to_view)


if __name__ == "__main__":
    app()
