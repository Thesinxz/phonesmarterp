# PhoneSmart ERP 🚀

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg?style=flat&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E.svg?style=flat&logo=supabase)

**PhoneSmart ERP** is an ultra-modern, lightning-fast web application designed specifically for electronic repair shops, cellphone stores, and technical assistances.

Built with **Next.js 15 (App Router)**, **Tailwind CSS 3**, and **Supabase**, this ERP provides a premium glassmorphism interface and a robust set of tools to manage Service Orders (OS), Inventory, Point of Sale (POS), and Finances.

## ✨ Features

- **📱 Specialized Service Orders (OS):** Advanced 6-step creation wizard including equipment triage, digital signature pad, and visual device pattern lock drawing.
- **📦 Smart Inventory Management:** Real-time dual-view (List & Kanban), automated pricing based on multi-gateway credit card algorithms, and margin calculation (BRL alongside USD options).
- **💡 Mass OCR Pricing:** Upload wholesale vendor invoices (PDFs/Images) directly to the browser. The system uses AI (Google Vision & Gemini) to parse items, calculate your precise local retail prices across 21x installments, and batch-import them to your database with 2 clicks.
- **🛒 Point of Sale (POS):** Fluid checkout experience with barcode scanning support and connected directly to your financial flows.
- **💳 Advanced Pricing Engine:** A globally aware pricing calculator that understands gateway fees (Pix, Debit, 1-21x Credit) and dynamically calculates your final shelf price to maintain your desired profit margin.
- **🔐 Enterprise Auth:** Secured by Supabase Auth with Row Level Security (RLS) guaranteeing data isolation per company.

## 🛠 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (React 19)
- **Styling:** Vanilla [Tailwind CSS](https://tailwindcss.com/) with custom Glassmorphism utilities
- **Database / Auth / Storage:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Icons:** [Lucide React](https://lucide.dev/)
- **State Management:** React Hooks + Supabase Realtime subscriptions
- **Forms/Toasts:** Sonner & Native React Forms

## 🚀 Getting Started

To run this project locally, you will need a Supabase project.

### 1. Clone the repository
```bash
git clone https://github.com/Thesinxz/phonesmarterp.git
cd phonesmarterp
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Copy the `.env.example` file to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase details in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Database Schema
Execute the SQL files located in `supabase/migrations/` in chronological order inside your Supabase project's SQL Editor to create all necessary tables, generic views, and RLS policies.

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
