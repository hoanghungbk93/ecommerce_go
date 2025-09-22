# CF Managed Clusters

Each directory here is a `stack directory` that creates a cloudformation managed
cluster. The goal(s) here are to :
- provide horizontally managed clustering options
- move cluster lifecycle outside the scope of a project's application stacks.


### Cluster Design
There are multiple architectural patterns we can take into consideration for
our clusters.

1. **Shared vertical tenancy, environment-based (shared VPC) cluster**

   This cluster would be shared by multiple verticals per environment. This is
   probably the simplest approach. Because the cluster is vertically shared,
   all of our services can commuicate via cluster networking. Vertical tenancy
   can be managed by making use of labels and taints on nodes and pods.

2. **Dedicated vertical tenancy, shared VPC clusters**

   Each vertical has their own cluster in a shared VPC. This allows us to access
   resources over local network, but introduces complexity for cross vertical
   pod to pod cluster communication.

### Directory Layout and Structure

Each directory under `templates/clusters` is considered to be a
`stack directory` for a cluster. A `stack directory` is an LTKP convention that
enables a regualr directory to be used as a blueprint for a cloudformaton stack.

From a `stack directory` we can infer several things:
1. stack name
2. type of stack (environment vs global)
3. tags, vertical and project information (from tags.json)

Here's a familiar example of `stack directory` for an EKS cluster:

    example-cluster-stack-dir
    ├── <env>.json
    ├── tags.json
    └── template.yml

The above cluster `stack directory` would result in the creation of stack named something along the lines of `<env>-example-cluster-stack-dir`.

OK, Let's apply the same convention using the actual `stack directory` for the devops EKS cluster, `devops-eks/`:

    devops-eks
    ├── dev.json
    ├── tags.json
    └── template.yml

Now, from this we can already assume some things...

- In the very least, the name of the stack will match the `dirname` of the template, i.e. `devops-eks`
- This exists of an `<env>.json` means this is an "environment" stack, which means an environment parameter is required for the template and will be used as the prefix for the stack name, e.g. `<env>-devops-eks`
- Using `tags.json` and the knowledge of [standard tags](https://my.rewardstyle.com/wiki/display/DEVOPS/Cost+Allocation+Tags+Standards):
    - Owner (set to `DevOps Horizontal`)
    - Product (set to `eks.rewardstyle.com/devops`)
    - Project (set to `devops-eks`)
    - Vertical (conditional, set to `devops`)

  ...we can generate a name for the environment stack more reliably with the following notation:

        <param:environmentName>-(tag:veticalName:ifVerticalPrefixEnabled-)?<tag:projectName>

    e.g. `dev-devops-eks`, `prod-devops-eks`, and if vertical prefixing is enabled: `prod-devops-devops-eks`

  This allows us to use `tags.json` for `stack directory` metadata in addition to populating resource tags
