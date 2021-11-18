import yaml

with open('Pulumi.yaml') as f:
    pulumi_config = yaml.safe_load(f)
    project_name = pulumi_config["name"]
    print(f"project_name={project_name}")
