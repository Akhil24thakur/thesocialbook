# SocialBook Marketing Website

This is the marketing/landing website for SocialBook, built with Next.js and Tailwind CSS.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Homepage**: Hero section with download links, app preview, and key features
- **Features**: Detailed list of all SocialBook features
- **About**: Information about the company and its mission
- **Support**: FAQ section and contact form
- **Privacy Policy**: Legal privacy information
- **Terms of Service**: Legal terms and conditions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Font**: Geist Sans & Mono

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## Deployment

This site is configured for deployment on Vercel, Netlify, or any static hosting provider.

### Vercel (Recommended)

1. Push to GitHub repository
2. Import project on [vercel.com](https://vercel.com)
3. Deploy automatically

### Netlify

1. Push to GitHub repository
2. Import project on [netlify.com](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `out` (for static export)

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Homepage
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   ├── features/          # Features page
│   │   ├── about/             # About page
│   │   ├── support/           # Support page
│   │   ├── privacy/           # Privacy policy
│   │   └── terms/             # Terms of service
│   └── components/
│       ├── Navigation.tsx     # Navigation bar
│       └── Footer.tsx         # Footer component
├── public/                    # Static assets
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## Brand Colors

- **Primary**: #8B5CF6 (Purple)
- **Secondary**: #EC4899 (Pink)
- **Background**: #0F0B1C (Dark Navy)

## License

© 2026 SocialBook. All rights reserved.
