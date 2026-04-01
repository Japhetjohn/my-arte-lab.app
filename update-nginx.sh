#!/bin/bash
# Update nginx configuration for SPA support

cat << 'EOF'

═══════════════════════════════════════════════════════════════════

🔧 NGINX CONFIG UPDATE REQUIRED

═══════════════════════════════════════════════════════════════════

SSH into server and run these commands:

ssh root@72.61.97.210
(password: @Kuulsinim45)

# Then run:
cat > /etc/nginx/sites-available/myartelab << 'NGINX_CONFIG'
server {
    server_name app.myartelab.com;

    client_max_body_size 50M;

    # Uploaded Images
    location ^~ /uploads/ {
        alias /var/www/myartelab/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/myartelab/backend/frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Frontend - SPA fallback
    location / {
        root /var/www/myartelab/backend/frontend;
        index index.html;
        try_files $uri /index.html;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/app.myartelab.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.myartelab.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = app.myartelab.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name app.myartelab.com;
    return 404;
}
NGINX_CONFIG

# Test and reload nginx
nginx -t && systemctl reload nginx

echo "✅ Nginx updated!"

═══════════════════════════════════════════════════════════════════

EOF
