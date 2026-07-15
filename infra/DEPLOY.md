# Zenvy Docker Deployment

Docker deployment uses one environment file:

```text
infra/.env
```

You do not need `client/.env` or `server/.env` when running with Docker Compose. Those files are only for local development outside Docker.

## Clean VPS With Free Ports 80 And 443

Use this when no other service is already using HTTP/HTTPS.

1. Point your domain DNS `A` record to the VPS IP.
2. Copy the example env file:

```bash
cd /opt/zenvy/app/infra
cp .env.example .env
nano .env
```

3. Set at least these values:

```env
PUBLIC_APP_URL=https://your-domain.com
CADDY_SITE_ADDRESS=your-domain.com
ACME_EMAIL=you@example.com
OTP_SECRET=use-a-long-random-secret
PAYSTATION_STORE_ID=2693-1775830347
PAYSTATION_PASSWORD=your-paystation-password
BD_BULK_SMS_TOKEN=your-bd-bulk-sms-token
IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id
```

For Docker deployments, keep `BD_BULK_SMS_TOKEN` in `infra/.env`. `server/.env` is only read when running the server outside Docker.

4. Start the stack:

```bash
docker compose -p zenvy-prod -f docker-compose.yml up -d --build
```

Caddy will request and renew SSL automatically.

## Existing VPS Where Ports 80 And 443 Are Already Used

Use this mode on a server like the current VPS where Mailu already owns public `80` and `443`.

1. Use the same `infra/.env`, but keep:

```env
CLIENT_BIND=127.0.0.1:3200
SERVER_BIND=127.0.0.1:4200
```

2. Start without the Zenvy Caddy container:

```bash
docker compose \
  -p zenvy-prod \
  -f docker-compose.yml \
  -f docker-compose.existing-proxy.yml \
  up -d --build
```

3. Configure your already-running public proxy to route:

```text
/api/*      -> http://127.0.0.1:4200
/uploads/*  -> http://127.0.0.1:4200
/health     -> http://127.0.0.1:4200
everything else -> http://127.0.0.1:3200
```

Do not start another container binding `80:80` or `443:443` on that VPS unless you first move the existing service using those ports.

## Existing VPS With Cloudflare DNS And Origin Rule

Use this mode when Cloudflare manages DNS for the domain and public `80`/`443` are already used by another service on the VPS.

Cloudflare will receive normal browser HTTPS on `443`, then forward Zenvy traffic to the VPS on `2087`. The Zenvy Caddy container listens on `2087` only, so Mailu keeps `80` and `443`.

1. In Cloudflare DNS, create a proxied record:

```text
Type: A
Name: zenvy
IPv4 address: your VPS IP
Proxy status: Proxied
```

2. In Cloudflare SSL/TLS, set SSL mode to:

```text
Full
```

3. In Cloudflare Rules > Origin Rules, create:

```text
If: (http.host eq "zenvy.your-domain.com")
Then: Destination Port = 2087
```

4. In `infra/.env`, use:

```env
PUBLIC_APP_URL=https://zenvy.your-domain.com
CADDY_SITE_ADDRESS=zenvy.your-domain.com
CLOUDFLARE_HTTPS_BIND=2087
```

5. Start the Cloudflare-port stack:

```bash
docker compose \
  -p zenvy-prod \
  -f docker-compose.yml \
  -f docker-compose.cloudflare.yml \
  up -d --build
```

6. Check it locally from the VPS. Use the real hostname here, because Caddy serves TLS for that hostname, not for `127.0.0.1`:

```bash
curl -kI --resolve zenvy.your-domain.com:2087:127.0.0.1 https://zenvy.your-domain.com:2087
```

If that succeeds, test the public Cloudflare route from your browser:

```text
https://zenvy.your-domain.com
```

Do not use DNS-only/gray-cloud for this mode. The Cloudflare record must be proxied so the Origin Rule can change the origin port.

## Useful Commands

```bash
docker compose -p zenvy-prod -f docker-compose.yml ps
docker compose -p zenvy-prod -f docker-compose.yml logs -f server
docker compose -p zenvy-prod -f docker-compose.yml logs -f caddy
docker compose -p zenvy-prod -f docker-compose.yml pull
docker compose -p zenvy-prod -f docker-compose.yml up -d --build
```

For the existing-proxy mode, include `-f docker-compose.existing-proxy.yml` in every command.

For the Cloudflare Origin Rule mode, include `-f docker-compose.cloudflare.yml` in every command.
