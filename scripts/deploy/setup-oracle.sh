#!/usr/bin/env bash
# ==============================================================================
# ELABS Platform — Automated Cloud Setup Script for Oracle Cloud / Ubuntu
# ==============================================================================
set -euo pipefail

echo "======================================================"
echo "   ELABS Cloud Deployment for Oracle Cloud VM         "
echo "======================================================"

# 1. Check Root / Sudo
if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run this script with sudo: sudo bash scripts/deploy/setup-oracle.sh"
  exit 1
fi

CURRENT_USER="${SUDO_USER:-$USER}"

# 2. Update System & Install Core Packages
echo "[1/6] Updating system packages..."
apt-get update -y
apt-get install -y curl git ufw iptables-persistent netfilter-persistent certbot

# 3. Configure Oracle Cloud Firewall & Iptables
# (Crucial: Oracle Cloud Ubuntu images block ports 80/443 in iptables by default)
echo "[2/6] Opening ports 80, 443, and 22 in Oracle Cloud OS firewall..."
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
netfilter-persistent save 2>/dev/null || true

# Also configure UFW if active
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true

# 4. Install Docker & Docker Compose if missing
echo "[3/6] Checking Docker installation..."
if ! command -v docker &> /dev/null; then
  echo "Installing Docker CE..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm -f get-docker.sh
  usermod -aG docker "$CURRENT_USER"
  systemctl enable docker
  systemctl start docker
  echo "Docker installed successfully."
else
  echo "Docker is already installed."
fi

# Ensure docker compose plugin exists
if ! docker compose version &> /dev/null; then
  echo "Installing docker-compose-plugin..."
  apt-get install -y docker-compose-plugin
fi

# 5. Detect Public IP & Setup Domain
echo "[4/6] Configuring Domain and Environment..."
PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s https://ifconfig.me || echo "127.0.0.1")
DEFAULT_DOMAIN="${PUBLIC_IP}.nip.io"

echo "Detected Public IP: $PUBLIC_IP"
echo "Free domain option available instantly: $DEFAULT_DOMAIN (zero setup needed!)"
echo "Alternatively, you can enter your DuckDNS domain (e.g., elabs-ruhuna.duckdns.org)."
read -r -p "Enter your domain name [$DEFAULT_DOMAIN]: " USER_DOMAIN
DOMAIN="${USER_DOMAIN:-$DEFAULT_DOMAIN}"

# 6. Generate .env file if missing
if [ ! -f ".env" ]; then
  echo "Creating .env configuration..."
  ROOT_PASS=$(openssl rand -hex 16)
  USER_PASS=$(openssl rand -hex 16)
  JWT_ACC=$(openssl rand -hex 32)
  JWT_REF=$(openssl rand -hex 32)

  cat <<EOF > .env
MYSQL_ROOT_PASSWORD=${ROOT_PASS}
MYSQL_DATABASE=elabs
MYSQL_USER=elabs
MYSQL_PASSWORD=${USER_PASS}
JWT_ACCESS_SECRET=${JWT_ACC}
JWT_REFRESH_SECRET=${JWT_REFRESH_REF:-$JWT_REF}
DOMAIN_NAME=${DOMAIN}
NEXT_PUBLIC_API_BASE=/api
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_VISION_BASE=/vision
COOKIE_DOMAIN=
EOF
  echo ".env created with generated secure passwords and domain $DOMAIN."
else
  echo "Existing .env found. Keeping existing credentials."
fi

# 7. Start Docker Containers
echo "[5/6] Building and starting ELABS production containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d --build

# 8. Verification & Summary
echo "[6/6] Verifying services..."
sleep 5
docker compose -f docker-compose.prod.yml ps

echo ""
echo "======================================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================================================"
echo "You can now access your ELABS portal at:"
echo "👉 http://${DOMAIN}"
echo ""
echo "Or directly via IP:"
echo "👉 http://${PUBLIC_IP}"
echo ""
echo "Default Logins:"
echo "  Admin:      admin@elabs.eng.ruh.ac.lk   /  Admin@123"
echo "  Lecturer:   lecturer@elabs.eng.ruh.ac.lk /  Lecturer@123"
echo "  Student:    student@elabs.eng.ruh.ac.lk  /  Student@123"
echo ""
echo "To view live logs: docker compose -f docker-compose.prod.yml logs -f"
echo "======================================================"
