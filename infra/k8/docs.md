### How to create secret keys locally

To create secret keys locally, use the following command:

```sh
kubectl create secret generic jwt-secret --from-literal=JWT_KEY=<<key>>
```

Replace `<<key>>` with your actual JWT key.

### How to check the created secrets

To check the created secrets, use the following command:

```sh
kubectl get secrets
```
