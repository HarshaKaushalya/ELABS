# 🚀 100% Free Cloud Hosting Guide (No Credit Card & No Headaches)

This guide deploys the complete **ELABS** platform (Next.js Web Portal, Express API, MySQL Database) using **1-Click Google/GitHub login**.

- **Cost:** \$0.00 (Free forever)
- **Credit Card Required:** **NO**
- **Complex Cloud Names/Tenancies:** **NO**

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│        Next.js Web Portal       │  ──> Render.com / Vercel (Free)
│ (https://elabs-web.onrender.com)│
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       Express API Gateway       │  ──> Render.com (Free)
│ (https://elabs-api.onrender.com)│
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     TiDB Serverless MySQL DB    │  ──> TiDB Cloud (Free Forever, 5GB)
│  (MySQL 8.0 Protocol with SSL)  │
└─────────────────────────────────┘
```

---

## ⚡ Step 1: Create Free Cloud MySQL Database (60 Seconds)

We use **TiDB Cloud** because it provides a true MySQL database that is 100% free forever without requiring a credit card.

1. Go to **[https://tidbcloud.com](https://tidbcloud.com)**.
2. Click **Sign in with Google** or **GitHub** (instant login, no credit card).
3. Click **Create Cluster** and select **Serverless (Free Forever)**.
4. Choose any cloud provider & region (e.g. AWS *Singapore*, *Frankfurt*, or *N. Virginia*).
5. Click **Create**.
6. On the connection dialog, click **Generate Password** and copy your credentials:
   - **Host:** (e.g. `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`)
   - **Port:** `4000`
   - **User:** (e.g. `23ab4cd.root`)
   - **Password:** `your_generated_password`
   - **Database Name:** `elabs`

### Initialize the Database Tables:
In your TiDB Cloud dashboard, click **SQL Editor** on the left:
1. Open [`scripts/db/01_schema.sql`](file:///C:/software%20project/scripts/db/01_schema.sql), copy all text, paste it into the SQL Editor, and click **Run**.
2. Open [`scripts/db/02_seed.sql`](file:///C:/software%20project/scripts/db/02_seed.sql), copy all text, paste it into the SQL Editor, and click **Run**.
*(All tables, laboratories, admin, lecturer, student accounts, and inventory items are now in the cloud!)*

---

## 📦 Step 2: Push Your Project to GitHub (if not already done)

1. Go to **[https://github.com](https://github.com)** and create a new repository called `elabs`.
2. Push your project code to that repository.

---

## 🌐 Step 3: Deploy on Render.com with 1-Click Blueprint (2 Minutes)

Render reads our included [`render.yaml`](file:///C:/software%20project/render.yaml) file and automatically configures both the API and Web services.

1. Go to **[https://render.com](https://render.com)**.
2. Click **Sign in with GitHub** or **Google** (No credit card required).
3. On the Render Dashboard, click the blue **New +** button (top right) and select **Blueprint**.
4. Connect your `elabs` GitHub repository.
5. Render will detect `render.yaml` and show:
   - Service 1: `elabs-api`
   - Service 2: `elabs-web`
6. Fill in the database environment variables using your TiDB Cloud credentials from Step 1:
   - `MYSQL_HOST`: Your TiDB Host (e.g., `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`)
   - `MYSQL_PORT`: `4000`
   - `MYSQL_USER`: Your TiDB Username
   - `MYSQL_PASSWORD`: Your TiDB Password
   - `MYSQL_DATABASE`: `elabs`
   - `MYSQL_SSL`: `true`
7. Click **Apply**.

Render will now build both the API and Frontend and provide you with two live HTTPS URLs:
- **Web Portal:** `https://elabs-web.onrender.com`
- **API Gateway:** `https://elabs-api.onrender.com`

---

## 🔑 Login to Your Cloud System

Once the build completes (takes ~2 minutes), open your live web URL:

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@elabs.eng.ruh.ac.lk` | `Admin@123` |
| **Lecturer** | `lecturer@elabs.eng.ruh.ac.lk` | `Lecturer@123` |
| **Student** | `student@elabs.eng.ruh.ac.lk` | `Student@123` |

---

## 💡 Summary Comparison

| Feature | Oracle Cloud | Render + TiDB Cloud (This Method) |
| :--- | :--- | :--- |
| **Credit Card Required?** | ⚠️ Yes (Strict verification) | 🟢 **NO (Zero cards)** |
| **Setup Complexity** | Linux SSH, VCN, Iptables | 🟢 **Web click & deploy** |
| **Account / Tenancy Name** | ⚠️ Confusing IDs | 🟢 **Google / GitHub 1-click** |
| **Automatic SSL / HTTPS** | Manual Certbot setup | 🟢 **100% Automatic** |
| **Free Subdomain** | DuckDNS manual DNS | 🟢 **Provided automatically (`.onrender.com`)** |
