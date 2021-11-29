# Create Knative Cluster
Create Kubernetes clusters with preinstalled Knative for easy app serving.

It's like "Create React App", but for setting up Kubernetes cluster with helpful features preinstalled (node/pod autoscaling, https, monitoring, app serving, etc). It uses Pulumi to programmatically create a Kubernetes cluster and provision all the resources required to serve an app with a single command. ✨

Once the cluster is set up, you can use Pulumi to manage or add resources using the familiar Javascipt/Typescript. Or, you can directly manipulate Kubernetes resources using kubectl if you prefer.

* Currently supports AWS only.
* Currently tested on MacOS.

If something doesn't work, please [file an issue](https://github.com/sidetrekAI/create-knative-cluster/issues/new).

<!-- If you have questions or need help, please join the [Slack channel](https://create-knative-cluster.slack.com) -->

💕 Any feedback or contribution is welcome and appreciated!


## Overview

### Motivation
It is far too much work to setup a working Kubernetes cluster with everything required to serve even a simple web app. Despite the introduction of interesting DevOps automation tools like Pulumi:

1. It's common to encounter countless issues and gotchas when putting them all together
2. It's hard to figure out what the best practice is for setting up and managing a Kubernetes cluster via Pulumi

This package aims to remove these frustrations - much like Create React App did for scaffolding a React app.

Underneath, this package uses Knative to serve apps. Knative has many interesting features that make serving apps in Kubernetes clusters painless compared to the traditional Kubernetes deployment/service pattern, such as:

* Scalable serverless setup
* Zero downtime deployment
* Easy rollbacks via revision-based deployments, 
* Flexible deployment options such as blue/green or canary deployments
* Traffic based autoscaling
  
Please check out the Knative docs [here](https://knative.dev/docs/) for more details.

### What's included
* AWS EKS cluster with Managed Node Group: Defaults to `t3.medium` instances with disk space of 30GB; 4x desired nodes (i.e. EC2 instances), 4x min nodes, and 20x max nodes
* Cluster Autoscaler: If there are pods pending due to lack of nodes, Cluster Autoscaler will automatically spin up more nodes in the cluster (up to max nodes above)
* Custom domain: Use your own custom domain by default
* Https by default: Cert-manager enables https traffic to the cluster with auto-renewed Let's Encrypt certificates
* Istio: As part of the Knative installation, Istio is installed with sidecar injection (via Istio Operator). Note that mtls between services is not enabled by default as of today
* Knative Serving: Knative Serving is what enabales easy app serving (installed via Knative Operator)
* Knative Eventing: Currently not really used for anything and not connected to any eventing sources (i.e. Kafka, Ceph, etc.)
* Monitoring via Kube Prometheus Stack: Monitoring with Prometheus and Grafana is enabled by default. Login to Grafana using the credentials you set with CLI by visiting grafana-dashboard.your-domain.com
* (Optional) AWS RDS instance
  * Staging DB: Defaults to `db.t3.micro` with 5GB of storage and 20GB of max storage
  * Prod DB: Defaults to `db.t3.small` with 10GB of storage and 100GB of max storage
* (Optional) App
  * Staging app: Knative Service that routes to `staging.<your-domain>` (i.e. `staging.sidetrek.com`) using Istio VirtualService
  * Pro app: Knative Service that routes to `*.<your-domain>` (i.e. `*.sidetrek.com`) using Istio VirtualService
    * For more information on Knative Service, see [Knative docs](https://knative.dev/docs/) 
    * For more information on Istio VirtualService, see [Istio docs](https://istio.io/latest/docs/reference/config/networking/virtual-service/)
    * To understand the internals of Create Knative Cluster better, see the [Internals](#internals) section

### Cost considerations
This project is completely open-source but the resources it provisions will cost you in potentially two ways.
1. Pulumi: Whether you're on a free or paid plan, the default setup should cost you nothing. On a paid plan, it'll come pretty close as create-knative-cluster will provision 200+ resources.
2. AWS: With 1x EKS cluster (~$70/mo), 4x t3.medium EC2 instances (~$120/mo), the default setup will cost you ~$200/mo. If you use the RDS option, that'll cost you extra depending on your storage requirements.


## <a name="creating-knative-cluster"></a>Creating a Knative cluster

### Pre-requisites
1. Install `aws` cli by following the instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
2. Create a Pulumi AWS Typescript project
   * Follow the instructions in [Pulumi docs](https://www.pulumi.com/docs/get-started/aws/begin/) to set up Pulumi and AWS credentials
3. Install `kubectl`
4. Install npm dependencies: `npm i @pulumi/aws @pulumi/awsx @pulumi/eks @pulumi/kubernetes @pulumi/kubernetes-cert-manager @pulumi/pulumi`
5. Set up a custom domain
   1. Register a domain - easiest way is to use AWS Route 53 to [register a new custom domain](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html#domain-register-procedure)
   2. If you're using some other DNS provider like GoDaddy, you can either 1) [migrate your domain to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html) or 2) create a Hosted zone in Route 53 (domain name must match exactly - e.g. `sidetrek.com`) and taking the created name servers (i.e. records with type `NS`) and replacing it with name servers in your current DNS provider like GoDaddy.
   3. Either way, save the ID of the Hosted zone - you'll need it when you set up the project
6. (Optional - but recommended) Setup `direnv` to enable directory specific kubectl setup if you passed in `--use-direnv` option. This is way, you can use kubectl with multiple projects (i.e. multiple Kubernetes clusters). To install:
   1. Follow the Basic Install in [direnv docs](https://direnv.net/)
   2. Once successfully installed, run `direnv allow .` in the project root directory

Other optional installations:
* (Optional) Install `istioctl`
   * Go to your home directory: `cd ~`
   * [Download the latest Istio release](https://github.com/istio/istio/releases/) to `/istio-installation` folder
   * Add `istioctl` to PATH
* (Optional) Install `kn` (Knative cli) - follow the instructions [here](https://knative.dev/docs/install/client/install-kn/)

### Get started
1. Deploy your app to a Kubernetes cluster (🧘🏼‍♀️ please be patient as the entire process can take 30-60 minutes to complete - provisioning AWS EKS alone can take 20+ minutes): 

```
npx create-knative-cluster init \
    --aws-region=<AWS region> \
    --pulumi-organization=<Pulumi account/organization name> \
    --custom-domain=<your-domain.com> \
    --custom-domain-zone-id=<AWS Hosted Zone ID for your custom domain> \
    --acme-email=<ACME email address to use for Let's Encrypt> \
    --use-direnv=true \
```

Example:
```
npx create-knative-cluster init \
    --aws-region=us-west-1 \
    --pulumi-organization=sidetrek \
    --custom-domain=sidetrek.com \
    --custom-domain-zone-id=Z02401234DADFCMEXX64X \
    --acme-email=hello@sidetrek.com \
    --use-direnv=true \
```

2. Point custom domain to Istio Ingress Gateway URL (this is the entry point to the cluster)
   1. Run `kubectl get svc -n istio-system` to get the External IP of `istio-system/istio-ingressgateway`
   2. Add a CNAME record in Route 53: in the custom domain's Hosted zone, Create record with:
      * Record name: *.<your-domain> (i.e. *.sidetrek.com), 
      * Record type: CNAME, and 
      * Value: Istio ingress gateway external IP from the previous step

If you'd like to see the whole project setup from start to finish, please see [tutorials section](#tutorials). 

### (Optional) Set up RDS

### (Optional) Set up a Create React App + Express app
1. Make sure `Dockerfile.prod` is present in the project root dir. This Dockerfile will be used to build and push the image to ECR. 

Here's an example of `Dockerfile.prod` assuming your react app is in `/frontend` dir and `npm run server:prod` runs the Express server (e.g.: `nodemon server/server.js` - of course, make sure you have `nodemon` installed in this case):

```
# For production build, include both api and frontend in the same build

# Build stage
FROM node:14.17-alpine AS builder
WORKDIR /app

COPY ./frontend/package*.json ./
RUN npm i
COPY ./frontend .
RUN npm run build

# Production stage
FROM node:14.17-alpine
WORKDIR /app
# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./
RUN npm i
# Copy local code to the container image.
COPY . ./
# Copy static assets from builder stage.
COPY --from=builder /app/build ./build
CMD npm run server:prod
```

2. Run `npx create-knative-cluster app`

### (Optional) Set up dev
Coming soon

### Customizing the default setup
You can customize the default setup simply by updating the stacks via Pulumi cli once the project setup is complete. 

But be mindful if you want to reduce the default resources allocations (e.g. reducing the minimum number of nodes or downgrading EC2 instance types for the cluster). It could fail to provision resources due to the max number of pods that can be created per EC2 instance type or run out of nodes to allocate Kubernetes pods to.

## Manage resources locally via Pulumi
You can add/update/delete any resources via Pulumi. This project was specifically designed for this use case.

All Pulumi setup files are copied in `/pulumi` folder during project creation. You can alter these files to alter the state of your AWS/Kubernetes resources using Pulumi cli.

Please refer to [Pulumi docs](https://www.pulumi.com/docs/) to learn how to use Pulumi.

[Tutorials section](#tutorials) also covers basic resource management with Pulumi.

## CLI Options
Coming soon

### Passwords
DB password and Granafa password entered via CLI is saved as Secrets (which is by default encrypted) in Pulumi config in their respective stacks.
* To retrieve the original password for DB: `pulumi stack select <db_staging or db_prod stack name>` and then `pulumi config get db_password`
* To retrieve the original password for Grafana: `pulumi stack select <kube_prometheus_stack stack name>` and then `pulumi config get grafana_password`

## Destroying project
You can destroy the entire project (assuming you didn't any more resources) by running:

```
npx create-knative-cluster destroy
```

### Caveats for using this command
* This command will completely destroy the project. This is useful for testing and also for starting with a clean state in case something goes wrong during the installation.
* This command <b>assumes the project was just created</b>. If you've added any new Pulumi stacks, you'll need to manually destroy those stacks first before running this command. Again, this command is built for when the setup process ran into unexpected issues or for testing. Once the project is setup, it's up to you to manage all resources using Pulumi.

### Destroying individual stacks
If you prefer to keep parts of it, you can destroy individual stacks by selecting the stack `pulumi stack select <stack name>` and then running:

```
pulumi destroy
```

You should be very careful when destroying individual stacks. There are dependencies you should be aware of. See "Caveats" section below.

### Caveats
* Dependencies between stacks:
  * Some stacks are dependent on other stacks which means attempting to destroy the parent stack can fail. For example, `cluster` stack will fail to destroy properly if there are resources still existing in the `cluster`. Be mindful of these dependencies - otherwise, you might have to do a lot of manual cleaning of orphaned resources.
  * In general, you should destroy things in this order:
    * App and app related services like RDS which is dependent on cluster services like Knative and Istio, 
    * Cluster services like Istio, Knative, cert-manager, etc, a
    * Finally, the cluster itself if necessary
* Known limitation with `pulumi destroy` for `knative_operator` stack:
  * You need to destroy the `knative_serving` and `knative_eventing` stacks before destroying `knative_operator`.
  * By design, destroying Knative Operator does not remove Knative CRDs (in case the CRDs are used in other resources).

## Rollbacks using Knative
Coming soon

## CD setup via Git Actions
Coming soon

## <a name="tutorials"></a>Tutorials
Coming soon

### Create React App + Express
* TODO: explain react env var setup

### Update existing resources using Pulumi
Coming soon

## Troubleshooting
* If destroy operation fails due to timeout (i.e. waiting for some cloud resource state to become 'destroyed'), then:
  * Destroy the resource manually - i.e. via AWS console or aws/kubectl cli
  * Refresh the Pulumi state (this will make sure Pulumi state is again in sync with cloud state): `pulumi refresh` (make sure you're in the right Pulumi stack)
  * Retry `create-knative-cluster destroy` (or `pulumi destroy` in the stack if destroying manually via Pulumi cli) to destroy the rest of the resources

## <a name="internals"></a>Internals of Create Knative Cluster
This explanation assumes basic understanding of Docker and Kubernetes. If you are not familiar with these topics, there's a lot of great resources on YouTube, such as this great intro series on [Docker](https://youtu.be/3c-iBn73dDE) and [Kubernetes](https://youtu.be/X48VuDVv0do).

### TL;DR
Coming soon

### Mini course
Coming soon
