# ☁️ ELABS — Complete Oracle Cloud Free Hosting Guide

This guide walks you through deploying the **ELABS Laboratory Management System** to **Oracle Cloud Infrastructure (OCI) Always Free Tier** using a **Free Subdomain** (DuckDNS or nip.io), **Docker Compose**, and **Nginx Reverse Proxy**.

---

## 📋 System Architecture

```
                    Internet
                       │
       ┌───────────────┴───────────────┐
       │   Public Free Subdomain / IP  │
       │ (e.g. elabs.duckdns.org / IP) │
       └───────────────┬───────────────┘
                       │ Port 80 / 443
                       ▼
       ┌───────────────────────────────┐
       │      Nginx Reverse Proxy      │
       └─┬─────────────┬─────────────┬─┘
         │             │             │
    / (Root)         /api/       /socket.io/
         │             │             │
         ▼             ▼             ▼
   ┌───────────┐ ┌───────────┐ ┌───────────┐
   │  Next.js  │ │  Express  │ │ Socket.IO │
   │  Web App  │ │    API    │ │ Real-time │
   │ (:3000)   │ │  (:4000)  │ │  (:4000)  │
   └───────────┘ └─────┬─────┘ └─────┬─────┘
                       │             │
                       └──────┬──────┘
                              │
                              ▼
                     ┌────────────────┐
                     │ MySQL 8.4 DB   │
                     │ (Volume Saved) │
                     └────────────────┘
```

---

## 🎁 What Makes This 100% Free?

| Component | Provider | Free Tier Specification |
| :--- | :--- | :--- |
| **Compute Server (VM)** | Oracle Cloud Always Free | **4 ARM Ampere Cores + 24 GB RAM** (or 2 AMD Micro VMs) — 100% Free forever |
| **Storage** | Oracle Cloud Always Free | 200 GB Block Storage Volume |
| **Bandwidth** | Oracle Cloud Always Free | 10 TB outbound data transfer per month |
| **Subdomain** | DuckDNS / nip.io | 100% Free subdomain pointing to your VM |
| **SSL Certificate** | Let's Encrypt | 100% Free automated HTTPS/SSL |

---

## 🚀 Step 1: Create an Oracle Cloud Always Free Account

1. Go to **[https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/)**.
2. Click **Start for free** and complete the registration.
   *(Note: Oracle requires a valid debit/credit card for identity verification. It charges a temporary \$1 authorization hold which is refunded immediately.)*
3. Choose your **Home Region** closest to you (e.g., *Singapore*, *Mumbai*, *Hyderabad*, or *Frankfurt*).

---

## 🖥️ Step 2: Create a Compute VM Instance

1. In the Oracle Cloud Console, open the navigation menu (top-left ☰) and select **Compute** > **Instances**.
2. Click **Create Instance**.
3. Configure the instance settings:
   - **Name:** `elabs-server`
   - **Placement:** Default Availability Domain
   - **Image and shape:**
     - Click **Change image**: Select **Ubuntu** (Version: `24.04` or `22.04 LTS`).
     - Click **Change shape**: Select **Ampere (ARM-based Processor)**:
       - Shape: `VM.Standard.A1.Flex`
       - OCPUs: **2 to 4** (Always Free tier permits up to 4)
       - Memory: **12 to 24 GB** (Always Free tier permits up to 24 GB)
       *(If ARM Ampere capacity is unavailable in your region, choose `VM.Standard.E2.1.Micro` AMD shape).*
   - **Networking:**
     - Virtual cloud network: Create new virtual cloud network (Default)
     - Subnet: Create new public subnet
     - **Assign a public IPv4 address:** Ensure **Yes** is selected!
   - **Add SSH keys:**
     - Select **Generate a key pair for me**.
     - Click **Save private key** and download `ssh-key-....key` to your computer.
4. Click **Create**. Wait 1–2 minutes until the status shows **Running** and note down the **Public IP Address** (e.g. `140.238.100.50`).

---

## 🔒 Step 3: Open Firewall Ports in Oracle Cloud Console

By default, Oracle Cloud VCN blocks ports 80 (HTTP) and 443 (HTTPS). You must open them:

1. On the instance details page, under **Instance Information**, click on your **Virtual Cloud Network** link.
2. In the left sidebar, click **Security Lists**, then click **Default Security List for...**.
3. Under **Ingress Rules**, click **Add Ingress Rules**:
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** `TCP`
   - **Destination Port Range:** `80,443`
   - **Description:** `Allow HTTP and HTTPS traffic`
4. Click **Add Ingress Rules**.

---

## 🌐 Step 4: Choose Your Free Subdomain

You have two simple options:

### Option A: Instant `nip.io` (Zero configuration!)
- Any public IP works automatically:
  - If your Oracle VM IP is `140.238.100.50`, your free domain is:
    ```
    140.238.100.50.nip.io
    ```
- No signup or registration required.

### Option B: Free Custom Subdomain via DuckDNS (Recommended)
1. Go to **[https://www.duckdns.org](https://www.duckdns.org)** and sign in (via GitHub, Google, etc.).
2. In the **domains** section, type your desired name (e.g. `elabs-ruhuna`).
3. Click **add domain**.
4. In the **current ip** box, paste your Oracle Cloud VM's Public IP and click **update ip**.
5. Your domain is now: `elabs-ruhuna.duckdns.org`.

---

## 💻 Step 5: Connect to Your VM and Transfer the Project

### 1. Connect via SSH
Open PowerShell or Terminal on your computer:
```bash
# If using Windows PowerShell:
ssh -i "path\to\your-ssh-key.key" ubuntu@<YOUR_ORACLE_PUBLIC_IP>
```
*(On Windows/Linux, if prompted with a key permission error: `chmod 400 your-ssh-key.key`)*

### 2. Copy the Project Code to the VM
You can push your project to a GitHub repository and clone it, or upload the directory directly using SCP:

**Method A (via Git / GitHub — Recommended):**
```bash
git clone https://github.com/<your-username>/<your-repo>.git elabs
cd elabs
```

**Method B (Direct SCP Upload from your computer):**
On your local computer (PowerShell):
```powershell
scp -i "path\to\your-ssh-key.key" -r "C:\software project" ubuntu@<YOUR_ORACLE_PUBLIC_IP>:~/elabs
```

---

## ⚡ Step 6: Run the Automated Setup Script

On your Oracle Cloud VM, navigate to the project directory and run:

```bash
cd ~/elabs
sudo bash scripts/deploy/setup-oracle.sh
```

### What this script does automatically:
1. Opens ports in Ubuntu's default Oracle `iptables` and `ufw` firewalls.
2. Installs Docker CE and Docker Compose.
3. Prompts for your domain (defaults to `<PUBLIC_IP>.nip.io` or your DuckDNS name).
4. Generates secure random credentials for MySQL and JWT authentication.
5. Builds and launches production containers (`elabs-mysql`, `elabs-api`, `elabs-web`, `elabs-nginx`).
6. Seeds all database tables, initial users, and laboratory equipment.

---

## 🔒 Step 7: Enable Free HTTPS / SSL (Let's Encrypt)

Once your domain points to your server and the site is accessible via HTTP, run:

```bash
sudo certbot certonly --webroot -w /var/lib/docker/volumes/elabs-prod_certbot_www/_data -d yoursubdomain.duckdns.org
```

Certbot will automatically generate the SSL certificates and renew them for free.

---

## 👥 Default Logins on First Launch

Once deployed, open `http://<YOUR_DOMAIN>` in your browser:

| Role | Email | Default Password |
| :--- | :--- | :--- |
| **System Administrator** | `admin@elabs.eng.ruh.ac.lk` | `Admin@123` |
| **Academic Lecturer** | `lecturer@elabs.eng.ruh.ac.lk` | `Lecturer@123` |
| **Engineering Student** | `student@elabs.eng.ruh.ac.lk` | `Student@123` |

*(Users will be prompted to set a new personal password on their first login).*

---

## 🛠️ Maintenance & Useful Commands

| Task | Command |
| :--- | :--- |
| **View Live Container Logs** | `docker compose -f docker-compose.prod.yml logs -f` |
| **View API Logs only** | `docker compose -f docker-compose.prod.yml logs -f api` |
| **Restart All Services** | `docker compose -f docker-compose.prod.yml restart` |
| **Stop All Services** | `docker compose -f docker-compose.prod.yml down` |
| **Update Code & Rebuild** | `git pull && docker compose -f docker-compose.prod.yml up -d --build` |
| **Backup Database to SQL file** | `docker exec elabs-mysql mysqldump -uroot -p<PASS> elabs > backup.sql` |
| **Include AI & Vision Services** | `docker compose -f docker-compose.prod.yml --profile full up -d` |

---

## 🎯 Verification Checklist

- [ ] Oracle Cloud VM is in **Running** state with Public IPv4.
- [ ] Ingress Rules for Ports **80** and **443** are active in Oracle VCN Security List.
- [ ] `setup-oracle.sh` executed without errors.
- [ ] `docker compose -f docker-compose.prod.yml ps` shows all 4 core containers (`healthy` or `up`).
- [ ] Navigating to `http://<YOUR_DOMAIN>` loads the ELABS login page.
- [ ] Logging in as `admin@elabs.eng.ruh.ac.lk` succeeds and opens the dashboard.
- [ ] Inventory items are displayed under the **Inventory** menu.
