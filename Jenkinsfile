// Pipeline: test -> build Docker image -> push to Docker Hub -> deploy to EC2 over SSH
// Jenkins needs: Docker installed, plus these credentials:
//   dockerhub   (Username with password)   ec2-ssh (SSH key for ec2-user)
pipeline {
  agent any
  environment {
    IMAGE = "YOUR_DOCKERHUB_USER/durga-enterprises"
    EC2_HOST = "YOUR_ELASTIC_IP"
  }
  stages {
    stage('Check') { steps { sh 'node --check server.js || docker run --rm -v "$PWD":/app -w /app node:20-alpine node --check server.js' } }
    stage('Build image') { steps { sh 'docker build -t $IMAGE:$BUILD_NUMBER -t $IMAGE:latest .' } }
    stage('Push') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'U', passwordVariable: 'P')]) {
          sh 'echo "$P" | docker login -u "$U" --password-stdin && docker push $IMAGE:$BUILD_NUMBER && docker push $IMAGE:latest'
        }
      }
    }
    stage('Deploy') {
      steps {
        sshagent(['ec2-ssh']) {
          sh 'ssh -o StrictHostKeyChecking=accept-new ec2-user@$EC2_HOST "cd ~/durga && docker compose pull && docker compose up -d && docker image prune -f"'
        }
      }
    }
  }
}
