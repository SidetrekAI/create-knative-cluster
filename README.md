# Create Knative Cluster
Create Kubernetes clusters with preinstalled Knative for easy app serving.

It's like "Create React App", but for setting up Kubernetes cluster with helpful features preinstalled (node/pod autoscaling, https, monitoring, app serving, etc). It uses Pulumi to programmatically create a Kubernetes cluster and provision all the resources required to serve an app with a single command (almost). 

Once the cluster is set up, you can use Pulumi to manage and update the resources using the familiar Javascipt/Typescript. Or use any other tool like kubectl if you prefer.

Currently supports AWS only.
Currently tested on MacOS.

If something doesn't work, please [file an issue](https://github.com/sidetrekAI/create-knative-cluster/issues/new).
If you have questions or need help, please join the [Slack channel](https://create-knative-cluster.slack.com)

Any feedback or contribution is welcome and appreciated!

## Overview

### Motivation
It is far too much work to setup a working Kubernetes cluster with everything required to serve even a simple web app. Despite the introduction of interesting DevOps automation tools like Pulumi, it's common to encounter countless issues and gotchas. This package aims to remove that frustration - much like Create React App did for scaffolding a React app.

Underneath, this package uses Knative to serve apps. Knative has many interesting features that make serving apps in Kubernetes clusters painless compared to traditional deployment/service pattern, such as scalable serverless setup, zero downtime deployment, easy rollbacks via revision-based deployments, blue/green or canary deployments, traffic based autoscaling, etc. Please check out the Knative docs [here](https://knative.dev/docs/) for more details.

### What's included
* AWS EKS cluster with Managed Node Group: Defaults to disk space of 30GB, 3 desired nodes, 3 min nodes, and 20 max nodes.
* Cluster Autoscaler: If there are pods pending due to lack of nodes, Cluster Autoscaler will automatically spin up more nodes in the cluster (up to max nodes above).
* Custom domain: Use your own custom domain by default.
* Cert-manager: Cert-manager enables https traffic to the cluster with auto-renewed Let's Encrypt certificates
* Istio: As part of the Knative installation, Istio is installed with sidecar injection (via Istio Operator). Note that mtls between services is not enabled by default as of now.
* Knative Serving: Knative Serving is what enabales easy app serving (installed via Knative Operator)
* Knative Eventing: Currently not really used for anything and not connected to any eventing sources (i.e. Kafka, Ceph, etc.)
* Kube Promotheus Stack: Monitoring with Prometheus and Grafana. Login to Grafana using the credentials you set with CLI by visiting grafana-dashboard.your-domain.com
* (Optional) RDS
* (Optional) App

### Cost considerations
This project is completely open-source but the resources it provisions will cost you in potentially two ways.
1. Pulumi: Whether you're on a free or paid plan, the default setup should cost you nothing (as of Nov 2021). On a paid plan, it'll come pretty close as create-knative-cluster will provision 200+ resources.
2. AWS: With EKS, EC2 instances, and RDS, the default setup will cost you ~$200/mo.

## Creating a Knative cluster

### Pre-requisites
1. Create a Pulumi project
2. Setup AWS credentials
3. Install `kubectl` and `istioctl`
4. (Optional - but recommended) Setup `direnv` to enable directory specific kubectl setup if you passed in `--use-direnv` option. This is way, you can use kubectl with multiple projects (i.e. multiple Kubernetes clusters). Follow the Basic Install in [direnv docs](https://direnv.net/) and run `direnv allow .` in the project directory to approve its use.

### Get started immediately
Deploy your app to a Kubernetes cluster with a single command. 

### CLI Options

### Destroying

### Rollbacks

### Create React App considerations
Env variable setup

### Passwords
DB password and Granafa password entered via CLI is saved as Secrets (which is by default encrypted) in Pulumi config in their respective stacks.
* To retrieve the original password for DB: `pulumi stack select <db_staging or db_prod stack name>` and then `pulumi config get db_password`
* To retrieve the original password for Grafana: `pulumi stack select <kube_prometheus_stack stack name>` and then `pulumi config get grafana_password`

### CD via Git Actions

## Internals of Create Knative Cluster

### TL;DR

### Mini course
Coming soon

