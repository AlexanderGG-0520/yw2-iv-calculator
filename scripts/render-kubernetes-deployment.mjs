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
spec:
  replicas: 1
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
            - containerPort: 8080
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
spec:
  selector:
    app: yw2-iv-calculator
  ports:
    - port: 80
      targetPort: 8080
`;

fs.writeFileSync("infra/kubernetes/app.yaml", manifest);
