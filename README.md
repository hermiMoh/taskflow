# TaskFlow — Jenkins CI/CD to Amazon EKS

TaskFlow is a full-stack task management application built with React, Express, and PostgreSQL. This portfolio project demonstrates a Jenkins pipeline that tests, builds, scans, publishes, and deploys container images to Amazon EKS.

## Architecture

![TaskFlow Architecture](docs/architecture.png)

```text
Developer → GitHub → Jenkins (local Docker host)
                       ├─ PostgreSQL integration-test container
                       ├─ Backend: ESLint + Jest
                       ├─ Frontend: ESLint + Vite build
                       ├─ Docker builds + Trivy image scans
                       ├─ Docker Hub (additional image registry)
                       └─ Amazon ECR (commit-SHA image tags)
                                     ↓
                        Amazon EKS: taskflow namespace
                          Frontend (2 pods; Nginx/React)
                                     ↓ /api/
                          Backend (2 pods; Express)
                                     ↓
                          PostgreSQL (1 pod)
                                     ↓
                          PVC → Amazon EBS (gp3)
```

Jenkins runs outside EKS. Frontend and backend are exposed as internal Kubernetes ClusterIP Services; the application has been accessed for demonstration using `kubectl port-forward`.

## Technology stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite 8, Nginx |
| API | Node.js, Express 5, `pg`, `helmet`, `express-validator` |
| Database | PostgreSQL 17 |
| Testing | Jest, Supertest, ESLint |
| Packaging | Docker, Docker Compose |
| CI/CD | Jenkins, Trivy |
| AWS | IAM, ECR, EKS, EBS |
| Kubernetes | Deployments, Services, PVC, RBAC |

## Run locally with Docker Compose

1. Create a local `.env` file (do **not** commit it):

   ```dotenv
   POSTGRES_DB=taskflow
   POSTGRES_USER=taskflow
   POSTGRES_PASSWORD=replace-with-a-strong-local-password
   ```

2. Start the stack from the repository root:

   ```bash
   docker compose up --build -d
   docker compose ps
   ```

3. Open `http://localhost:8081`.

4. Stop containers without removing database data:

   ```bash
   docker compose down
   ```

**Database initialization:** Compose mounts `database/init.sql` into PostgreSQL's initialization directory. This script runs automatically **only when the database volume is first initialized**. `docker compose down -v` deletes the local database volume and its data; do not run it unless you intend to reset the database.

## Development commands

```bash
cd backend
npm ci
npm run lint
npm test
npm start
```

```bash
cd frontend
npm ci
npm run lint
npm run build
npm run dev
```

Backend scripts are `start`, `dev`, `test`, and `lint`; frontend scripts are `dev`, `build`, `lint`, and `preview`.

## Jenkins CI/CD pipeline

The repository's `Jenkinsfile` performs the following sequence:

1. Check out source and read `VERSION` / Git commit metadata.
2. Start a temporary PostgreSQL test database and load `database/init.sql`.
3. Run backend linting and Jest tests, and frontend linting/build.
4. Build backend/frontend Docker images.
5. Scan images with Trivy.
6. Publish images to Docker Hub and Amazon ECR.
7. Update the EKS backend and frontend Deployments with ECR images tagged by Git commit SHA.
8. Wait for successful Kubernetes rolling updates.

**Scope:** Kubernetes rollout verification is automated; a post-deployment HTTP smoke-test stage was explored but is **not part of the finalized pipeline**. Trivy's configured scan should not be described as a strict vulnerability gate unless its exit-code behavior is verified.

## EKS deployment

The `infrastructure/eks/cluster.yaml` file defines `taskflow-cluster` in `eu-north-1`, Kubernetes `1.34`, with a managed node group of two `t3.medium` workers (20 GiB node volumes). The cluster configuration disables NAT gateways and does not enable private-only worker networking. See [Deployment guide](docs/deployment-guide.md) for prerequisites and steps.

The application runs in the `taskflow` namespace:

| Workload | Replicas | Service |
| --- | ---: | --- |
| Frontend | 2 | ClusterIP:80 |
| Backend | 2 | ClusterIP:3000 |
| PostgreSQL | 1 | ClusterIP:5432 |

PostgreSQL uses a PVC backed by an EBS volume through the EBS CSI driver. Unlike Docker Compose, **fresh EKS deployments currently require manual database schema initialization**; see the deployment guide.

```bash
kubectl get deployments,pods,services,pvc -n taskflow
kubectl port-forward -n taskflow svc/taskflow-frontend 8081:80
```

Then visit `http://localhost:8081`.

## Security considerations

- A dedicated Jenkins IAM identity has narrowly scoped ECR and EKS permissions.
- An EKS access entry maps the identity to a Kubernetes group with namespace-scoped RBAC.
- Jenkins injects AWS credentials through its credentials store; secrets must never be committed.
- Kubernetes Secrets are used for application configuration; avoid publishing their contents.
- Trivy scans Docker images; review findings and decide whether to enforce failure thresholds.
- This is a **portfolio/demo deployment**, not a hardened production environment.

## Lessons learned

- Docker socket permissions and tool installation in containerized Jenkins.
- EKS IAM authentication versus Kubernetes RBAC authorization.
- ECR tagging with Git commit identifiers for traceability.
- EBS CSI volume provisioning and PostgreSQL persistence.
- Database schema bootstrapping in new environments.
- Deployment rollouts, service discovery, and troubleshooting `kubectl port-forward` permissions.

## Future improvements

- Automated database migrations or an initialization Job.
- Automated HTTP smoke tests and more complete integration tests.
- Terraform-managed AWS infrastructure.
- GitOps with Argo CD; monitoring and alerting.
- Hardened credential strategy (short-lived AWS credentials) and ingress/TLS where appropriate.

## Evidence

Add **redacted** screenshots under `docs/screenshots/` showing a successful Jenkins run, ECR image tags, ready EKS Deployments, and the working application. Do not include account secrets, access keys, passwords, or private kubeconfig files.

## Cost management

EKS, EC2 workers, EBS, and networking resources can incur charges while provisioned. Follow the cleanup checklist in the deployment guide after capturing portfolio evidence.
