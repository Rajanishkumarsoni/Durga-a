# Durga Enterprises: website + backend

Static website plus a small Node server (no npm packages needed, Node 18+).

- `public/index.html`: the website, with a "Request a callback" form
- `public/admin.html`: private page to see requests (`/admin.html`)
- `server.js`: serves the site, saves requests to `data/requests.json`, protects the admin API

## Run on your computer
    ADMIN_TOKEN=pick-a-strong-password node server.js
Open http://localhost:3000 and http://localhost:3000/admin.html

## Host it (Render, free tier example)
1. Put this folder in a GitHub repository.
2. On render.com: New > Web Service > connect the repo.
3. Runtime Node, Build command empty, Start command `node server.js`.
4. Add environment variable `ADMIN_TOKEN` (your admin password).
5. Free plans lose saved files when the service restarts, so either add a paid persistent disk
   and set `DATA_DIR` to its mount path, or set `NOTIFY_WEBHOOK` (Slack/Discord) so every request
   also reaches you instantly.
Railway, Fly.io, a VPS, or any host that runs Node works the same way.
Custom domain: buy one (for example durgaenterprises.in if available) and add it in your host's domain settings.

## Contact details
In `public/index.html`, find `var CONTACT={...}` and fill in phone, whatsapp (with country code, digits only),
email, address and hours. Buttons appear automatically.

## AWS + Docker + Jenkins deployment
See Dockerfile, docker-compose.yml, Caddyfile and Jenkinsfile. On the EC2 server create ~/durga containing
docker-compose.yml, Caddyfile and a .env file with IMAGE, ADMIN_TOKEN and optionally SITE_ADDRESS / NOTIFY_WEBHOOK.
Maven is not used: this app is Node.js, not Java.
