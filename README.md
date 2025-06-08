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

Paste the Kubernetes worker setup script.

Run it and then use the join command provided by the master node.

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
