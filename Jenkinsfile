pipeline {
    agent any

    environment {
        CI_NETWORK = 'taskflow-ci'
        TEST_DB_CONTAINER = 'taskflow-postgres-test'

        DB_HOST = 'taskflow-postgres-test'
        DB_PORT = '5432'
        DB_NAME = 'taskflow_test'
        DB_USER = 'postgres'
        DB_PASSWORD = 'postgres_test_password'
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
    }

    post {

        always {
            echo 'Cleaning TaskFlow CI resources...'

            sh '''
                docker rm -f $TEST_DB_CONTAINER 2>/dev/null || true
            '''
        }

        success {
            echo 'TaskFlow backend CI passed!'
        }

        failure {
            echo 'TaskFlow backend CI failed.'
        }
    }
}