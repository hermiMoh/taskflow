# TaskFlow — AWS EKS deployment guide

This guide documents the deployment pattern demonstrated in the TaskFlow portfolio. Review and adapt IAM permissions, manifests, credentials, and Kubernetes versions for your own AWS account before executing commands.

## 1. Prerequisites

- AWS account with permissions to create EKS, ECR, IAM, EC2, and EBS resources.
- AWS CLI, `eksctl`, Docker, and `kubectl` installed and configured.
- Jenkins running with Docker CLI, AWS CLI, and `kubectl`, with access to the Docker daemon.
- A local clone of the TaskFlow repository.

Never commit `.env`, kubeconfig files, AWS access keys, or Jenkins backups. Use a dedicated Jenkins IAM principal and the Jenkins credentials store. Prefer short-lived credentials where feasible.

## 2. Create container registries

```bash
aws ecr create-repository --repository-name taskflow-backend --region eu-north-1
aws ecr create-repository --repository-name taskflow-frontend --region eu-north-1
```

Skip creation if the repositories already exist. Update image repository references in the Kubernetes manifests to match your own AWS account ID.

## 3. Create the EKS cluster

The supplied `infrastructure/eks/cluster.yaml` specifies:

- Cluster: `taskflow-cluster`
- Region: `eu-north-1`
- Kubernetes: `1.34`
- Managed node group: `taskflow-workers`, two `t3.medium` nodes (min 1, max 2), 20 GiB node volume
- NAT gateway disabled; worker nodes are not configured for private-only networking

```bash
eksctl create cluster -f infrastructure/eks/cluster.yaml
aws eks update-kubeconfig --name taskflow-cluster --region eu-north-1
kubectl get nodes
```

**Version caveat:** The configured Kubernetes version may cease to be supported by EKS; check the currently supported versions before provisioning a new cluster.

## 4. Configure persistent storage

TaskFlow uses an EBS CSI-backed `gp3` StorageClass and a PVC. The EBS CSI driver requires appropriate AWS permissions and installation. In the original deployment it was configured as an EKS add-on with Pod Identity.

Review the storage manifests and install the driver with appropriate permissions before applying the PVC:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/storageclass-gp3.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl get pvc -n taskflow
```

A PVC may remain Pending until a consuming Pod is scheduled if the StorageClass uses delayed binding. Do not treat this alone as an error.

## 5. Configure application and database

Review `k8s/postgres-configmap.yaml` and the Deployment manifests. Ensure referenced Kubernetes Secrets exist **without committing their real values**. The exact Secret names and keys must match the manifests.

Apply the relevant manifests after updating image references and required configuration:

```bash
kubectl apply -f k8s/postgres-configmap.yaml
kubectl apply -f k8s/postgres-service.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

**Fresh database schema initialization (currently manual):** Once PostgreSQL is ready, run:

```bash
kubectl exec -i -n taskflow deployment/taskflow-postgres -- \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < database/init.sql
```

This creates the `tasks` table if it does not already exist. Automating schema migrations is a future improvement.

## 6. Configure Jenkins deployment access

1. Create a dedicated AWS IAM identity for Jenkins with ECR push permissions for the two TaskFlow repositories and `eks:DescribeCluster` for this cluster.
2. Create an EKS access entry for that principal, mapping it to the Kubernetes group `taskflow-deployers`.
3. Apply `k8s/jenkins-deployer-rbac.yaml` to grant the group namespace-scoped Deployment and Pod permissions.
4. Store AWS credentials in Jenkins Credentials using ID `aws-taskflow-jenkins` (for the demonstrated IAM-user setup).
5. Confirm Jenkins can call `aws sts get-caller-identity`, `kubectl get deployments -n taskflow`, and `kubectl auth can-i patch deployments -n taskflow`.

Use the repository's `Jenkinsfile` to run CI, publish Git-commit-tagged images to ECR, update Deployments, and wait for rollout. The finalized pipeline does not require port-forward permissions because the optional smoke-test stage is excluded.

## 7. Verify application

```bash
kubectl get deployments -n taskflow
kubectl get pods -n taskflow
kubectl get pvc -n taskflow
kubectl get deployments -n taskflow \
  -o custom-columns='NAME:.metadata.name,IMAGE:.spec.template.spec.containers[*].image'
kubectl port-forward -n taskflow svc/taskflow-frontend 8081:80
```

Open `http://localhost:8081`. Create and update a task, refresh the page, and confirm persistence. This is a manual functional check, distinct from automated Kubernetes rollout status.

## 8. Troubleshooting

| Symptom | First checks |
| --- | --- |
| Jenkins cannot access EKS | `aws sts get-caller-identity`, EKS access entry, Kubernetes RoleBinding |
| `Forbidden` on Deployment update | `kubectl auth can-i patch deployments -n taskflow` under Jenkins identity |
| PostgreSQL PVC Pending | EBS CSI driver, StorageClass, scheduler events, AWS permissions |
| API returns `relation "tasks" does not exist` | Initialize schema from `database/init.sql` |
| New image fails rollout | `kubectl describe deployment`, `kubectl get pods`, `kubectl logs` |
| Port forwarding fails | Confirm Service name/namespace, Pod readiness, and relevant RBAC permissions |

## 9. Capture evidence and clean up AWS

Before cleanup, save redacted screenshots of Jenkins, ECR image tags, Kubernetes workloads, and the application. Back up any data you need; deleting a cluster or PVC may destroy persistent data.

```bash
# Check resources first
kubectl get pvc,pv -n taskflow
aws eks describe-cluster --name taskflow-cluster --region eu-north-1

# When ready to remove the demo cluster:
eksctl delete cluster -f infrastructure/eks/cluster.yaml
```

After deletion, inspect AWS EKS, EC2, EBS volumes/snapshots, load balancers, public IPv4 addresses, CloudFormation stacks, ECR repositories, and CloudWatch logs for remaining billable resources. ECR repositories and images may remain after deleting the cluster; remove them only if no longer needed. Verify cleanup in AWS billing/cost tools.
