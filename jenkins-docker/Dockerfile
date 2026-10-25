FROM jenkins/jenkins:lts-jdk21

USER root

# Basic tools
RUN apt-get update \
    && apt-get install -y \
        ca-certificates \
        curl \
        git \
        gnupg \
        unzip \
    && rm -rf /var/lib/apt/lists/*

# --------------------------------------------------
# Install Node.js 22 + npm
# --------------------------------------------------
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# --------------------------------------------------
# Install Docker CLI + Docker Compose plugin
# --------------------------------------------------
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
        -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && . /etc/os-release \
    && echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian ${VERSION_CODENAME} stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y \
        docker-ce-cli \
        docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*


    # Install kubectl
ARG KUBECTL_VERSION=v1.34.0

RUN curl -fsSLo /usr/local/bin/kubectl \
    "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" \
    && chmod +x /usr/local/bin/kubectl


# --------------------------------------------------
# Install AWS CLI v2
# --------------------------------------------------
RUN set -eux; \
    ARCH="$(dpkg --print-architecture)"; \
    case "$ARCH" in \
        amd64) AWS_ARCH="x86_64" ;; \
        arm64) AWS_ARCH="aarch64" ;; \
        *) echo "Unsupported architecture: $ARCH"; exit 1 ;; \
    esac; \
    curl -fsSL \
        "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" \
        -o /tmp/awscliv2.zip; \
    unzip -q /tmp/awscliv2.zip -d /tmp; \
    /tmp/aws/install; \
    rm -rf /tmp/aws /tmp/awscliv2.zip

USER jenkins