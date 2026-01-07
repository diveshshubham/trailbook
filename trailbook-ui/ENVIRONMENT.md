## Environment setup

Set the following environment variable when running the UI:

- **`NEXT_PUBLIC_API_BASE_URL`**: backend API base URL (include `/api` if your backend uses it)
  - Example: `http://localhost:3001/api`

In local dev, you can create a `.env.local` file (Next.js will load it automatically) and add:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

