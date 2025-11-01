# GreenChainz Frontend

React-based frontend for the GreenChainz B2B sustainable sourcing platform.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Axios** - HTTP client
- **CSS Modules** - Component styling

## Development

### Prerequisites

- Node.js 16+
- Backend API running on port 3001

### Installation

```bash
npm install
```

### Running the Dev Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Features

- **Supplier Directory** - Browse verified sustainable suppliers
- **Real-time Health Status** - Monitor backend API connection
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Sustainability Ratings** - Visual representation of supplier ratings
- **Modern UI** - Clean, professional interface with green theme

## API Integration

The frontend connects to the backend API through Vite's proxy configuration:

- `/api/*` - Proxied to `http://localhost:3001/api/*`
- `/health` - Proxied to `http://localhost:3001/health`

## Project Structure

```
frontend/
├── public/           # Static assets
├── src/
│   ├── components/   # React components
│   │   ├── Header.jsx
│   │   ├── Hero.jsx
│   │   ├── SupplierList.jsx
│   │   └── SupplierCard.jsx
│   ├── App.jsx      # Main application component
│   ├── App.css      # Application styles
│   ├── main.jsx     # Application entry point
│   └── index.css    # Global styles
├── index.html       # HTML template
├── vite.config.js   # Vite configuration
└── package.json     # Dependencies and scripts
```

## Components

### Header
- Navigation menu
- Real-time health status indicator
- Responsive design

### Hero
- Platform introduction
- Key statistics display
- Call-to-action

### SupplierList
- Grid layout of supplier cards
- Responsive grid
- Loading and error states

### SupplierCard
- Supplier information display
- Sustainability rating visualization
- Verification badge
- Contact button

## Styling

The application uses CSS custom properties (variables) for consistent theming:

```css
--primary-green: #2d5016
--secondary-green: #4a7c2c
--light-green: #7fb069
--accent: #e8f5e9
```

## Environment

No environment variables are required for local development. The Vite proxy automatically forwards API requests to the backend.
