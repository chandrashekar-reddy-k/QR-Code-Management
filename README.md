# VillagKart QR Studio — Enterprise QR Management Module

> Centralized QR Creation, Smart Routing, Distribution & Analytics for the VillagKart Admin & ERP Ecosystem.

![VillagKart QR Studio](https://raw.githubusercontent.com/chandrashekar-reddy-k/QR-Code-Management/main/public/villagekart_logo.svg)

---

## 🌾 Overview

**VillagKart QR Studio** is a complete, production-grade module designed for the VillagKart rural-commerce ecosystem. It connects marketing teams, hub operations managers, Village Gramin Executives (VGEs), and Shop-on-Wheels fleet drivers into a unified QR lifecycle management platform.

### Core Workflow Supported
$$\text{Create QR} \longrightarrow \text{Configure Destination} \longrightarrow \text{Customize Design} \longrightarrow \text{Generate Assets} \longrightarrow \text{Publish} \longrightarrow \text{Track Scans} \longrightarrow \text{Attribute Registrations \& Orders} \longrightarrow \text{Audit Lifecycle}$$

---

## 🎨 Design System & Visual Identity

The UI adheres strictly to the **VillagKart Admin & Packer Warehouse** corporate aesthetic:
- **Primary Brand Color**: `#00891D` (VillagKart Emerald Green)
- **Secondary Accent**: `#EF5A06` (Harvest Orange)
- **Neutral Canvas**: `#F3F4F6` (Light neutral ERP background)
- **Surfaces**: Crisp white `#FFFFFF` cards with subtle `#E5E7EB` borders and micro-shadows
- **Typography**: Clean `'Segoe UI', -apple-system, sans-serif` hierarchy with high legibility
- **Status Badges**: Restrained ERP color pills (Active, Pending Approval, Draft, Paused, Expired, Archived)

---

## 📑 Complete 15-Screen Inventory

| # | Screen | Purpose |
|---|---|---|
| **01** | **QR Dashboard** | Live KPI metrics (Scans, Registrations, Orders), 30-day trajectory chart, funnel progression, top QR rankings, and quick-create presets. |
| **02** | **QR Code Listing** | Central management inventory with multi-criteria filters, search, preview thumbnails, status badges, and bulk actions (Pause, Archive, CSV Export). |
| **03** | **Create QR — Basic Details** | Dynamic form revealing type-specific fields for *App Download*, *Campaign*, *Vehicle (Shop-on-Wheels)*, *Referral*, *Product*, *Feedback*, and *Payment*. |
| **04** | **Destination Configuration** | Technical routing engine with shortlink generation, Android Play Store / deep link, iOS App Store / universal link, fallback web URL, and HTTPS verification. |
| **05** | **Design Studio** | Three-panel studio with approved templates, custom color pickers, brand emblem overlay, quiet-zone validation, error correction (L/M/Q/H), and live canvas rendering. |
| **06** | **Print & Digital Export** | Dual-tab export packaging: CMYK PDF with bleed marks, lossless SVG vectors, 300 DPI high-res PNGs, and digital square/story cards for WhatsApp. |
| **07** | **Review & Publish** | Comprehensive 5-point validation checklist, role-based publishing authorization, or direct routing to the manager approval queue. |
| **08** | **QR Code Details** | Dedicated management hub with 6 deep tabs: Overview, Destinations & Versioning ($v1.0 \to v1.1$), Generated Assets, Scan History, Analytics, and Audit Log. |
| **09** | **Scan History** | Operational forensic investigation tool with device forensics, source categorization, and strict DPDP customer privacy safeguards (masked GPS/phone numbers). |
| **10** | **Analytics Dashboard** | Answers the 5 core business questions: scan volume, unique visitors, channels, conversion funnel, and collection hub rankings. |
| **11** | **Campaign Management** | Groups QR assets under marketing initiatives (e.g. *Phirangipuram Customer Acquisition*), tracking budget spend, timeline, and Cost Per Acquisition (CPA). |
| **12** | **QR Templates Library** | Standardized gallery of approved designs (A3 posters, A5 flyers, vehicle vinyls, VGE cards) with brand lock indicators and one-click cloning. |
| **13** | **Referral QR Management** | Connects QR scans to VGE field agents and customer acquisition incentives with anti-fraud verification (rewards require verified first orders, never scans alone). |
| **14** | **Permissions & Approvals** | Interactive Role Permission Matrix (*Admin*, *Marketing*, *Hub Manager*, *VGE*) and active review queue with approve/reject actions and audit notes. |
| **15** | **Settings & Audit Logs** | Enterprise edge routing domains, approved domain allowlists, attribution windows, rate limiting, alert thresholds, and tamper-evident audit logs. |
| **18** | **Field Mobile Pocket** | Mobile-responsive viewport simulator for VGE field executives, offering one-tap WhatsApp sharing, pocket QR cards, and field scan testing. |

---

## ⚡ Interactive Live Features

1. **Real QR Code Canvas Engine**: Built using client-side canvas and vector generators supporting custom foreground/background colors, CTA frames, and central brand emblems.
2. **Interactive Phone Scanner Simulator**: Click "Test Scan" on any QR code to open an interactive smartphone viewfinder with animated scan line, device OS routing evaluation, and real-time event injection into the database.
3. **Role Switcher Dropdown**: Instant switching between *Admin*, *Marketing*, *Hub Manager*, and *VGE* in the top bar to observe real-time permission gating and workflow changes.
4. **Desktop ERP vs. Field Pocket Mode**: One-click toggle in the top bar to preview both the desktop administration console and the mobile field interface.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation & Local Run
```bash
# 1. Clone repository
git clone https://github.com/chandrashekar-reddy-k/QR-Code-Management.git
cd QR-Code-Management

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Production Build
```bash
# Generate optimized production bundle in /dist
npm run build

# Preview production build locally
npm run preview
```

---

## 📦 Project Structure

```
QR-Code-Management/
├── public/
│   ├── villagekart_logo.svg     # Official VillagKart brand emblem
├── src/
│   ├── components/
│   │   ├── QRCodeRenderer.jsx   # Real QR matrix & frame canvas generator
│   │   ├── Sidebar.jsx          # Clean white ERP navigation sidebar
│   │   ├── TopHeader.jsx        # Top action bar with search, role & device toggle
│   │   ├── TestScanModal.jsx    # Interactive device routing scanner simulator
│   │   └── ToastContainer.jsx   # Global alert & notification banners
│   ├── context/
│   │   └── QRContext.jsx        # Central state store with localStorage persistence
│   ├── data/
│   │   └── mockData.js          # Enterprise seed data for hubs, villages, & QRs
│   ├── screens/
│   │   ├── Screen01_Dashboard.jsx
│   │   ├── Screen02_Listing.jsx
│   │   ├── Screen03_07_Wizard.jsx
│   │   ├── Screen08_Details.jsx
│   │   ├── Screen09_ScanHistory.jsx
│   │   ├── Screen10_Analytics.jsx
│   │   ├── Screen11_Campaigns.jsx
│   │   ├── Screen12_Templates.jsx
│   │   ├── Screen13_Referrals.jsx
│   │   ├── Screen14_Permissions.jsx
│   │   ├── Screen15_Settings.jsx
│   │   └── Screen18_MobileFieldMode.jsx
│   ├── App.jsx                  # Main layout and screen router
│   ├── index.css                # VillagKart ERP design tokens and component styles
│   └── main.jsx                 # React root entry point
├── package.json
├── vite.config.js
└── README.md
```

---

## 🚢 Deployment Guide

### Vercel / Netlify
This Vite single-page application is zero-config ready for Vercel or Netlify:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Docker Deployment
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 📄 License
Internal proprietary software developed for the **VillagKart ERP & Admin Ecosystem**. All rights reserved.
