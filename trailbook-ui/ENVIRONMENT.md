## Environment setup

Set the following environment variable when running the UI:

- **`NEXT_PUBLIC_API_BASE_URL`**: backend API base URL (include `/api` if your backend uses it)
  - Example: `http://localhost:3001/api`
- **`NEXT_PUBLIC_USERS_API_BASE_URL`**: users/profile API base URL (include `/api`)
  - Example: `http://localhost:3002/api`
- **`NEXT_PUBLIC_ALBUMS_WRITE_API_BASE_URL`** (optional): if album PATCH endpoints are hosted on a different service
  - Example: `http://localhost:3002/api`
- **`NEXT_PUBLIC_BADGES_API_BASE_URL`**: badges API base URL (include `/api`)
  - Example: `http://localhost:3003/api`
- **`NEXT_PUBLIC_MEDIA_BASE_URL`** (optional): base URL used to resolve S3 keys into image URLs
  - Example: `https://your-bucket.s3.amazonaws.com/`

In local dev, you can create a `.env.local` file (Next.js will load it automatically) and add:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_USERS_API_BASE_URL=http://localhost:3002/api
NEXT_PUBLIC_ALBUMS_WRITE_API_BASE_URL=http://localhost:3002/api
NEXT_PUBLIC_BADGES_API_BASE_URL=http://localhost:3003/api
```

