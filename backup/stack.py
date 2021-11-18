import typer
from prefect import Flow, case
from tasks import (
    get_project_name,
    get_stack_name,
    pulumi_stack_up,
    pulumi_stack_destroy,
    run_shell_cmd,
    check_k8s_resource_ready,
)
from helpers import view_task_results

app = typer.Typer()


@app.command("up")
def up(
    stack_name: str = typer.Argument(..., help="The name of the Pulumi stack to be deployed"),
    stack_file_path: str = typer.Argument(..., help="The absolute path of the Pulumi automation script to be deployed"),
):
    """
    Same as running `pulumi up` for the given Pulumi stack, but with Pulumi Automation API

    Usage example:
        create-knative-cluster stack up stack_name
    """
    with Flow("pulumi-flow") as flow:
        """
        Deploy Pulumi stacks
        """
        project_name_output = get_project_name()
        stack_name_output = get_stack_name(stack_name)
        stack_output = pulumi_stack_up(stack_name, stack_file_path, [project_name_output, stack_name_output])

    state = flow.run()


@app.command("destroy")
def destroy(
    stack_name: str = typer.Argument(..., help="The name of the Pulumi stack to be destroyed"),
    stack_file_path: str = typer.Argument(..., help="The absolute path of the Pulumi automation script to be deployed"),
):
    """
    Same as running `pulumi destroy` for the given Pulumi stack, but with Pulumi Automation API

    Usage example:
        create-knative-cluster stack destroy stack_name stack_file_path
    """
    with Flow("pulumi-flow") as flow:
        """
        Deploy Pulumi stacks
        """
        project_name_output = get_project_name()
        stack_name_output = get_stack_name(stack_name)
        stack_output = pulumi_stack_destroy(stack_name, stack_file_path, [project_name_output, stack_name_output])

    state = flow.run()
