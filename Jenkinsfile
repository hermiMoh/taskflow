pipeline {
    agent any

    environment {
        TEST_DB_CONTAINER = 'taskflow-postgres-test'

        DB_HOST = 'host.docker.internal'
        DB_PORT = '5433'
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

        stage('Backend - Install') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Backend - Lint') {
            steps {
                dir('backend') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Start Test Database') {
            steps {
                sh '''
                    docker rm -f $TEST_DB_CONTAINER 2>/dev/null || true

                    docker run -d \
                        --name $TEST_DB_CONTAINER \
                        -e POSTGRES_DB=$DB_NAME \
                        -e POSTGRES_USER=$DB_USER \
                        -e POSTGRES_PASSWORD=$DB_PASSWORD \
                        -p 5433:5432 \
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
                            pg_isready -U $DB_USER -d $DB_NAME
                        then
                            echo "PostgreSQL is ready."
                            exit 0
                        fi

                        sleep 2
                    done

                    echo "PostgreSQL did not become ready."
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

        stage('Backend - Test') {
            steps {
                dir('backend') {
                    sh '''
                        NODE_ENV=test \
                        DB_HOST=$DB_HOST \
                        DB_PORT=$DB_PORT \
                        DB_NAME=$DB_NAME \
                        DB_USER=$DB_USER \
                        DB_PASSWORD=$DB_PASSWORD \
                        npm test -- --runInBand
                    '''
                }
            }
        }

        stage('Frontend - Install') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Frontend - Lint') {
            steps {
                dir('frontend') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Frontend - Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Docker - Build Backend') {
            steps {
                sh '''
                    docker build \
                        -t taskflow-api:ci \
                        ./backend
                '''
            }
        }

        stage('Docker - Build Frontend') {
            steps {
                sh '''
                    docker build \
                        -t taskflow-frontend:ci \
                        ./frontend
                '''
            }
        }
    }

    post {
        always {
            echo 'Cleaning CI resources...'

            sh '''
                docker rm -f $TEST_DB_CONTAINER 2>/dev/null || true
            '''
        }

        success {
            echo 'TaskFlow CI pipeline succeeded!'
        }

        failure {
            echo 'TaskFlow CI pipeline failed!'
        }
    }
}