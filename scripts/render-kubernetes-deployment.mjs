import fs from "node:fs";

const sha = process.argv[2];
if (!/^[0-9a-f]{40}$/.test(sha ?? "")) {
  console.error("usage: node scripts/render-kubernetes-deployment.mjs <40-char git sha>");
  process.exit(2);
}

const manifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: yw2-iv-calculator
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: yw2-iv-calculator
  template:
    metadata:
      labels:
        app: yw2-iv-calculator
    spec:
      containers:
        - name: web
          image: ghcr.io/alexandergg-0520/yw2-iv-calculator:${sha}
          ports:
            - name: http
              containerPort: 8080
          resources:
            requests:
              cpu: 25m
              memory: 32Mi
            limits:
              cpu: 250m
              memory: 128Mi
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 2
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
          securityContext:
            allowPrivilegeEscalation: false
            runAsNonRoot: true
            runAsUser: 1000
            runAsGroup: 1000
            capabilities:
              drop:
                - ALL
---
apiVersion: v1
kind: Service
metadata:
  name: yw2-iv-calculator
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  selector:
    app: yw2-iv-calculator
  ports:
    - name: http
      port: 80
      targetPort: http
`;

fs.writeFileSync("infra/kubernetes/app.yaml", manifest);
