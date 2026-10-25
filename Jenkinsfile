pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    environment {
        CI_NETWORK = 'taskflow-ci'
        TEST_DB_CONTAINER = 'taskflow-postgres-test'

        DB_HOST = 'taskflow-postgres-test'
        DB_PORT = '5432'
        DB_NAME = 'taskflow_test'
        DB_USER = 'postgres'
        DB_PASSWORD = 'postgres_test_password'

        DOCKERHUB_USERNAME = 'medhermi'

        // AWS ECR and EKS configuration
        AWS_DEFAULT_REGION = 'eu-north-1'
        AWS_ACCOUNT_ID = '453971897797'
        EKS_CLUSTER = 'taskflow-cluster'
        K8S_NAMESPACE = 'taskflow'

        ECR_REGISTRY = '453971897797.dkr.ecr.eu-north-1.amazonaws.com'
        // END AWS ECR and EKS configuration
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Read Version') {
            steps {
                script {
                    env.APP_VERSION = readFile('VERSION').trim()
                }

                echo "Building TaskFlow version ${APP_VERSION}"
            }
        }

        stage('Build Metadata') {
            steps {
                script {
                    env.GIT_SHORT_SHA = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }

                echo "Version: ${APP_VERSION}"
                echo "Commit: ${GIT_SHORT_SHA}"
                echo "Jenkins build: ${BUILD_NUMBER}"
            }
        }

        stage('Prepare CI Network') {
            steps {
                sh '''
                    docker network inspect $CI_NETWORK >/dev/null 2>&1 || \
                    docker network create $CI_NETWORK
                '''
            }
        }

        stage('Start Test Database') {
            steps {
                sh '''
                    docker rm -f $TEST_DB_CONTAINER 2>/dev/null || true

                    docker run -d \
                        --name $TEST_DB_CONTAINER \
                        --network $CI_NETWORK \
                        -e POSTGRES_DB=$DB_NAME \
                        -e POSTGRES_USER=$DB_USER \
                        -e POSTGRES_PASSWORD=$DB_PASSWORD \
                        postgres:17-alpine
                '''
            }
        }

        stage('Wait for PostgreSQL') {
            steps {
                sh '''
                    echo "Waiting for PostgreSQL..."

                    for i in $(seq 1 30); do

                        if docker exec $TEST_DB_CONTAINER \
                            pg_isready \
                            -U $DB_USER \
                            -d $DB_NAME
                        then
                            echo "PostgreSQL is ready."
                            exit 0
                        fi

                        sleep 2
                    done

                    echo "PostgreSQL failed to become ready."

                    docker logs $TEST_DB_CONTAINER

                    exit 1
                '''
            }
        }

        stage('Initialize Test Database') {
            steps {
                sh '''
                    docker exec -i $TEST_DB_CONTAINER \
                        psql \
                        -U $DB_USER \
                        -d $DB_NAME \
                        < database/init.sql
                '''
            }
        }

        stage('Backend CI') {
            steps {
                sh '''
                    docker run --rm \
                        --network $CI_NETWORK \
                        -v jenkins_home:/var/jenkins_home \
                        -w "$WORKSPACE/backend" \
                        -e NODE_ENV=test \
                        -e DB_HOST=$DB_HOST \
                        -e DB_PORT=$DB_PORT \
                        -e DB_NAME=$DB_NAME \
                        -e DB_USER=$DB_USER \
                        -e DB_PASSWORD=$DB_PASSWORD \
                        node:22-alpine \
                        sh -c "npm ci && npm run lint && npm test -- --runInBand"
                '''
            }
        }
    
        stage('Frontend CI') {
            steps {
                sh '''
                    docker run --rm \
                        -v jenkins_home:/var/jenkins_home \
                        -w "$WORKSPACE/frontend" \
                        node:22-alpine \
                        sh -c "npm ci && npm run lint && npm run build"
                '''
            }
        }

        stage('Build Backend Image') {
            steps {
                sh '''
                    echo "Building backend version $APP_VERSION"

                    docker build \
                        -t taskflow-backend:$APP_VERSION \
                        -t taskflow-backend:latest \
                        ./backend
                '''
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh '''
                    echo "Building frontend version $APP_VERSION"

                    docker build \
                        -t taskflow-frontend:$APP_VERSION \
                        -t taskflow-frontend:latest \
                        ./frontend
                '''
            }
        }

        stage('Security Scan - Backend') {
            steps {
                sh '''
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest \
                        image \
                        --severity HIGH,CRITICAL \
                        --ignore-unfixed \
                        taskflow-backend:$APP_VERSION
                '''
            }
        }

        stage('Security Scan - Frontend') {
            steps {
                sh '''
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest \
                        image \
                        --severity HIGH,CRITICAL \
                        --ignore-unfixed \
                        taskflow-frontend:$APP_VERSION
                '''
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_TOKEN'
                    )
                ]) {
                    sh '''
                        echo "$DOCKER_TOKEN" | \
                            docker login \
                            -u "$DOCKER_USER" \
                            --password-stdin

                        docker tag \
                            taskflow-backend:$APP_VERSION \
                            $DOCKER_USER/taskflow-backend:$APP_VERSION

                        docker tag \
                            taskflow-backend:$APP_VERSION \
                            $DOCKER_USER/taskflow-backend:latest

                        docker tag \
                            taskflow-frontend:$APP_VERSION \
                            $DOCKER_USER/taskflow-frontend:$APP_VERSION

                        docker tag \
                            taskflow-frontend:$APP_VERSION \
                            $DOCKER_USER/taskflow-frontend:latest

                        docker push \
                            $DOCKER_USER/taskflow-backend:$APP_VERSION

                        docker push \
                            $DOCKER_USER/taskflow-backend:latest

                        docker push \
                            $DOCKER_USER/taskflow-frontend:$APP_VERSION

                        docker push \
                            $DOCKER_USER/taskflow-frontend:latest

                        docker logout
                    '''
                }
            }
        }


        stage('Push Images to Amazon ECR') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-taskflow-jenkins',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        set -eu

                        echo "Authenticating to Amazon ECR..."

                        aws ecr get-login-password \
                            --region "$AWS_DEFAULT_REGION" | \
                            docker login \
                            --username AWS \
                            --password-stdin "$ECR_REGISTRY"

                        echo "Tagging backend image..."

                        docker tag \
                            taskflow-backend:$APP_VERSION \
                            $ECR_REGISTRY/taskflow-backend:$GIT_SHORT_SHA

                        echo "Tagging frontend image..."

                        docker tag \
                            taskflow-frontend:$APP_VERSION \
                            $ECR_REGISTRY/taskflow-frontend:$GIT_SHORT_SHA

                        echo "Pushing backend image..."

                        docker push \
                            $ECR_REGISTRY/taskflow-backend:$GIT_SHORT_SHA

                        echo "Pushing frontend image..."

                        docker push \
                            $ECR_REGISTRY/taskflow-frontend:$GIT_SHORT_SHA

                        echo "Images published successfully."
                    '''
                }
            }
        }



        stage('Deploy to Amazon EKS') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-taskflow-jenkins',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        set -eu

                        export KUBECONFIG="$WORKSPACE/kubeconfig"

                        echo "Connecting to Amazon EKS..."

                        aws eks update-kubeconfig \
                            --name "$EKS_CLUSTER" \
                            --region "$AWS_DEFAULT_REGION"

                        echo "Deploying backend..."

                        kubectl set image \
                            deployment/taskflow-backend \
                            backend=$ECR_REGISTRY/taskflow-backend:$GIT_SHORT_SHA \
                            -n "$K8S_NAMESPACE"

                        echo "Deploying frontend..."

                        kubectl set image \
                            deployment/taskflow-frontend \
                            frontend=$ECR_REGISTRY/taskflow-frontend:$GIT_SHORT_SHA \
                            -n "$K8S_NAMESPACE"

                        echo "Kubernetes Deployments updated."
                    '''
                }
            }
        }


        stage('Verify EKS Rollout') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-taskflow-jenkins',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        set -eu

                        export KUBECONFIG="$WORKSPACE/kubeconfig"

                        echo "Checking backend rollout..."

                        kubectl rollout status \
                            deployment/taskflow-backend \
                            -n "$K8S_NAMESPACE" \
                            --timeout=180s

                        echo "Checking frontend rollout..."

                        kubectl rollout status \
                            deployment/taskflow-frontend \
                            -n "$K8S_NAMESPACE" \
                            --timeout=180s

                        echo "Current Deployments:"

                        kubectl get deployments \
                            -n "$K8S_NAMESPACE"

                        echo "Current Pods:"

                        kubectl get pods \
                            -n "$K8S_NAMESPACE"

                        echo "TaskFlow deployment successful!"
                    '''
                }
            }
        }  
    }

    post {
        always {
            echo 'Cleaning TaskFlow CI/CD resources...'

            sh '''
                docker rm -f "$TEST_DB_CONTAINER" 2>/dev/null || true

                rm -f "$WORKSPACE/kubeconfig"
            '''
        }

        success {
            echo 'TaskFlow CI/CD pipeline completed successfully!'
        }

        failure {
            echo 'TaskFlow CI/CD pipeline failed.'
        }
    }
}