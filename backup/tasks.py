from pathlib import Path
import json
import yaml
from prefect import task
from prefect.tasks.shell import ShellTask
from helpers import merge_input_strings


@task(log_stdout=True, name="get_project_name")
def get_project_name() -> str:
    with open("Pulumi.yaml") as f:
        pulumi_config = yaml.safe_load(f)
        project_name = pulumi_config["name"]
        return json.dumps({"project": project_name})


@task(log_stdout=True, name="get_stack_name")
def get_stack_name(stack_name) -> str:
    return json.dumps({"project": stack_name})


@task(log_stdout=True)
def save_inputs(stack_name: str, inputs: list[str] = []) -> str:
    """
    Temporarily save stringified JSON input from Pulumi to JSON file on disk so it can be read from build_pulumi_stack_cmd task

    returns:
        absolute path to the temporary input JSON file
    """
    print(f"inputs={inputs}")
    if inputs == []:
        return ""
    else:
        inputs = merge_input_strings(inputs)

    cwd = Path().resolve()
    input_path = (cwd / f"prefect/temp/task_inputs/{stack_name}.json").resolve()
    print(f"input_path={input_path}")
    with open(input_path, "w+", encoding="utf-8") as f:
        data = json.loads(inputs)
        json.dump(data, f, ensure_ascii=False, indent=2)
        return input_path


@task(log_stdout=True)
def build_pulumi_stack_cmd(pulumi_script_path: str, input_path: str = "", destroy: bool = False) -> str:
    cmd = f"./node_modules/ts-node/dist/bin.js ./pulumi/index.ts -f {pulumi_script_path} {f'-i {input_path}' if input_path != '' else ''} -d {destroy}"
    print(f"cmd={cmd}")
    return cmd


def pulumi_stack(stack_name, pulumi_script_path, inputs: list[str] = [], destroy: bool = False):
    """
    args:
        stack_name: name of the Pulumi stack
        pulumi_script_path: relative path (from project root) of the pulumi automation script file
        inputs: list of pulumi_stack_up task outputs (stringified JSON from Pulumi Automation program return object)

    returns:
        Prefect task that runs the Pulumi Automation program for the given stack_name
    """
    input_path = save_inputs(stack_name, inputs)
    cmd = build_pulumi_stack_cmd(pulumi_script_path, input_path, destroy)
    shell_task = ShellTask(name=f"{stack_name} stack up", stream_output=True)
    return shell_task(command=cmd)


def pulumi_stack_up(stack_name, pulumi_script_path, inputs):
    return pulumi_stack(stack_name, pulumi_script_path, inputs, destroy=False)


def pulumi_stack_destroy(stack_name, pulumi_script_path, inputs):
    return pulumi_stack(stack_name, pulumi_script_path, inputs, destroy=True)


@task(log_stdout=True)
def build_shell_cmd(cmd) -> str:
    return cmd


def run_shell_cmd(task_name, cmd):
    shell_cmd = build_shell_cmd(cmd)
    shell_task = ShellTask(name=task_name, stream_output=True)
    return shell_task(command=shell_cmd)


def check_k8s_resource_ready(task_name, cmd):
    # shell_cmd = build_shell_cmd(cmd)
    # shell_task = ShellTask(name=task_name, stream_output=True)
    # shell_output = shell_task(command=shell_cmd)
    shell_output = run_shell_cmd(task_name, cmd)
    return False if "No resources found" in shell_output else True
