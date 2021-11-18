import json

def merge_input_strings(inputs: list[str]) -> str:
    dicts = [json.loads(input) for input in inputs]
    merged_dict = {}
    for d in dicts:
        for k, v in d.items():
            merged_dict[k] = v
    return json.dumps(merged_dict)


def view_task_results(flow, state, tasks):
    for task_name in tasks:
        print(state.result[flow.get_tasks(name=task_name)[0]]._result)
