# 🚗 FuelFinder

**FuelFinder** is a smart petrol price comparison tool that helps you find the cheapest fuel near you while factoring in travel costs. Save money on every fill-up by making informed decisions based on real-time pricing data.

## ✨ Features

- **Real-Time Fuel Prices**: Fetches live petrol station data from PetrolSpy
- **Smart Cost Calculation**: Calculates total cost including travel distance and fuel consumption
- **Location-Based Search**: Find stations near your current location or any custom location
- **Multiple Fuel Types**: Support for U91, U95, U98, E10, Diesel, and LPG
- **Savings Calculator**: See exactly how much you'll save on each fill-up
- **Distance Caching**: Optimized with SQLite caching to reduce API calls and improve performance
- **Dark Mode**: Beautiful UI with light and dark theme support
- **Persistent Settings**: Your preferences are saved locally for a personalized experience
- **Auto-Refresh**: Automatically updates prices every 5 minutes
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) with Radix UI
- **Database**: [Prisma](https://www.prisma.io/) with SQLite
- **Maps API**: [Google Maps Platform](https://developers.google.com/maps)
- **Containerization**: [Docker](https://www.docker.com/)

## 📋 Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Google Maps API key with the following APIs enabled:
  - Distance Matrix API
  - Maps JavaScript API

## 🚀 Getting Started

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/lindsaysperring/fuelfinder.git
   cd fuelfinder
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Google Maps API key:

   ```env
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   MAINTENANCE_KEY=your_secret_maintenance_key
   ```

4. **Initialize the database**

   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

5. **Run the development server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser.

### Docker Deployment

FuelFinder is optimized for Docker. You can run it in production mode or development mode using Docker Compose.

#### Production Mode

1.  **Configure Environment**: Ensure your `.env` file is set up with your API keys.
2.  **Run with Docker Compose**:

    ```bash
    docker-compose up -d
    ```

    The application will be available at [http://localhost:3000](http://localhost:3000).

#### Development Mode (with Hot Reload)

```bash
docker-compose -f docker-compose.dev.yml up
```

#### Manual Build

```bash
# Build the image
docker build -t fuelfinder:latest .

# Run the container
docker run -d \
  --name fuelfinder \
  -p 3000:3000 \
  --env-file .env \
  -v fuelfinder-data:/app/data \
  fuelfinder:latest
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GOOGLE_MAPS_API_KEY` | Google Maps API key for distance calculations | Yes | - |
| `MAINTENANCE_KEY` | Secret key for securing cron jobs (e.g., cache cleanup) | Yes | - |
| `DATABASE_URL` | Database connection string | No | `file:./dev.db` |
| `NEXT_PUBLIC_HOME_LATITUDE` | Default starting latitude | No | `-34.9285` |
| `NEXT_PUBLIC_HOME_LONGITUDE` | Default starting longitude | No | `138.6007` |
| `NEXT_PUBLIC_APP_NAME` | Application name | No | `FuelFinder` |

### Database

The application uses SQLite by default. The database file is stored at `prisma/dev.db` in local development and `/app/data/prod.db` in the Docker container.

## 🧹 Maintenance

### Cache Cleanup

The application caches distance calculations to minimize Google Maps API usage. Old cache entries are automatically cleaned up via a cron job.

You can manually trigger cleanup:

```bash
curl -H "Authorization: Bearer your_maintenance_key" http://localhost:3000/api/cron/cleanup
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
