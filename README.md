# create-knative-cluster
Create a Kubernetes cluster with preinstalled Knative for easy app serving.

It's like "Create React App", but for setting up a Kubernetes cluster. It's uses Pulumi to programmatically create a Kubernetes cluster and provision all the resources required to serve an app with a single command (almost). 

Once the cluster is set up, you can use Pulumi to manage and update the resources using the familiar Javascipt/Typescript. Or use any other tool like kubectl if you prefer.

Currently supports AWS only.
Currently tested on MacOS.

If something doesn't work, please [file an issue](https://github.com/sidetrekAI/create-knative-cluster/issues/new).
If you have questions or need help, please join the [Slack channel](https://slack.com)

🙏 Any feedback or contribution is welcome and appreciated!

## Motivation
It is far too much work to setup a working Kubernetes cluster with all the setups required to serve a web app. Despite the introduction of interesting DevOps automation tools like Pulumi, it's common to encounter countless issues and gotchas. This package aims to remove that frustration - much like Create React App did for scaffolding a React app.

Underneath, this package uses Knative to serve apps in Kubernetes. Knative has many interesting features that make serving an app painless compared to traditional Kubernetes deployment/service pattern, such as scalable serverless setup, easy rollback via its revision based deployments, canary deployments, traffic based autoscaling, etc. Please check out the docs [here](https://knative.dev/docs/) for more details.

## Pre-requisites
1. Create a Pulumi project
2. Setup AWS credentials
3. Install `kubectl` and `istioctl`
4. (Optional - but recommended) Setup `direnv` to enable directory specific kubectl setup if you passed in `--use-direnv` option. This is way, you can use kubectl with multiple projects (i.e. multiple Kubernetes clusters). Follow the Basic Install in [direnv docs](https://direnv.net/) and run `direnv allow .` in the project directory to approve its use.

## Costs
This project is completely open-source but the resources this cli provisions will cost you in potentially two ways.
1. Pulumi: Whether you're on a free or paid plan, the default setup should cost you nothing (as of Nov 2021). On a paid plan, it'll come pretty close as create-knative-cluster will provision 200+ resources.
2. AWS: With EKS, EC2 instances, and RDS, the default setup will cost you ~$200/mo.

## Get started immediately
Deploy your app to a Kubernetes cluster with a single command. 

# CLI Options

# Mini-course on the internals


