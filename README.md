# Node.js CI/CD Pipeline using Jenkins, Docker, and Kubernetes

This project automates the deployment of a Dockerized Node.js application using Jenkins, Docker Hub, and Kubernetes on AWS EC2 instances.

---

## 🔧 Step 1: Launch EC2 Instances

- Launch 2 EC2 instances (Ubuntu 22.04 LTS), type `t2.medium`
  - One for **Kubernetes Master**
  - One for **Kubernetes Worker**

---

## 📦 Step 2: Install Kubernetes Master

Create a script:
```bash
nano master.sh
```
```script
#!/bin/bash

set -e

echo "[Step 1] Load Kernel Modules..."
cat <<EOF | sudo tee /etc/modules-load.d/containerd.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

echo "[Step 2] Set Sysctl Parameters for Kubernetes Networking..."
cat <<EOF | sudo tee /etc/sysctl.d/kubernetes.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system

echo "[Step 3] Install Required Packages..."
sudo apt update -y
sudo apt install -y apt-transport-https ca-certificates curl gpg

echo "[Step 4] Add Kubernetes APT Repository..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /" | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list > /dev/null

sudo apt update

echo "[Step 5] Install Kubernetes Components..."
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

echo "[Step 6] Install and Configure containerd..."
sudo apt install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

sudo systemctl restart containerd
sudo systemctl enable containerd

echo "[Step 7] Initialize Kubernetes Cluster..."
sudo kubeadm init --pod-network-cidr=192.168.0.0/16

echo "[Step 8] Configure kubectl for Regular User..."
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

echo "[Step 9] Install Calico CNI Plugin..."
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

echo "[Step 10] Show Node Status..."
kubectl get nodes

echo "✅ Kubernetes Master Setup Completed!"

Paste the Kubernetes master setup script (with containerd, kubeadm, kubectl, Calico, etc.)

Run the script:
```bash
chmod +x master.sh
sudo ./master.sh
```

Verify node:
```bash
kubectl get nodes
```

---

## 🔧 Step 3: Install Kubernetes Worker

Create a script:
```bash
nano worker.sh
```
```script
#!/bin/bash

set -e

echo "[Step 1] Load Kernel Modules..."
cat <<EOF | sudo tee /etc/modules-load.d/containerd.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

echo "[Step 2] Set Sysctl Parameters..."
cat <<EOF | sudo tee /etc/sysctl.d/kubernetes.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system

echo "[Step 3] Install Required Packages..."
sudo apt update -y
sudo apt install -y apt-transport-https ca-certificates curl gpg

echo "[Step 4] Add Kubernetes Repository..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /" | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list > /dev/null

sudo apt-get update

echo "[Step 5] Install Kubernetes Tools..."
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

echo "[Step 6] Install and Configure containerd..."
sudo apt install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

sudo systemctl restart containerd
sudo systemctl enable containerd

echo "[INFO] Worker node setup complete. Now join this node to the cluster using the kubeadm join command from the master node."

Paste the Kubernetes worker setup script.

Run it and then use the join command provided by the master node.
```

---

## 🐳 Step 4: Run Jenkins Container

```bash
docker run -u 0 --privileged --name jenkins -it -d -p 8080:8080 -p 50000:50000 -v /var/run/docker.sock:/var/run/docker.sock -v $(which docker):/usr/bin/docker -v /home/jenkins_home:/var/jenkins_home jenkins/jenkins:latest
```

---

## 🔑 Step 5: Get Jenkins Admin Password

```bash
docker exec -it jenkins bash
cat /var/jenkins_home/secrets/initialAdminPassword
```

Access Jenkins:  
```
http://<Public-IP>:8080
```

---

## 🧩 Step 6: Install Jenkins Plugins

Install:
- `Pipeline: Stage View`
- `Docker Pipeline`

---

## ⚙️ Step 7: Configure Kubernetes & Docker Credentials in Jenkins

1. Go to **Manage Jenkins → Credentials → Global → Add Credentials**
2. Add:
   - **Kubeconfig** with ID: `kubernetes` (`cat ~/.kube/config`)
   - **Docker Hub** with ID: `dockerlogin`

---

## 🔗 Step 8: Set up GitHub Webhook

- Go to GitHub → Your Repo → Settings → Webhooks → Add Webhook

Fill:
- **Payload URL**: `http://<Jenkins-IP>:8080/github-webhook/`
- **Secret**: Jenkins API Token

---

## 🛠️ Step 9: Create Jenkins Pipeline

Create a new pipeline job and use this script:

```groovy
pipeline {
  environment {
    dockerimagename = "<dockerhub_username>/<image_name>"
    dockerImage = ""
  }

  agent any

  stages {
    stage('Checkout Source') {
      steps {
        git '<your_repo>'
      }
    }

    stage('Build image create') {
      steps {
        script {
          dockerImage = docker.build(dockerimagename)
        }
      }
    }

    stage('Pushing Image') {
      environment {
        registryCredential = 'dockerlogin'
      }
      steps {
        script {
          docker.withRegistry('https://registry.hub.docker.com', registryCredential) {
            dockerImage.push("latest")
          }
        }
      }
    }

    stage('Deploying App to K8S') {
      steps {
        script {
          kubernetesDeploy(configs: "deploymentservice.yml", kubeconfigId: "kubernetes")
        }
      }
    }
  }
}
```

---

## 🚀 Step 10: Trigger Build

- Click **Build Now**
- Monitor via **Console Output**
- Verify deployment in Kubernetes cluster and Docker Hub

---

## 📁 Project Name Suggestion

**Repository name:** `nodejs-jenkins-k8s-pipeline`

---
Created by: Meet, Dhruv, Bhadresh, Nirmeet, Vardhit, Rutvik  
