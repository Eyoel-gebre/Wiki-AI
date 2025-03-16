# Client

This is the client application.

## Setup and Development

### Installation

```bash
# Install dependencies
npm install
```

### Development Server

```bash
# From the client directory
npm start
```

This will:
- Start a development server on port 3000
- Enable hot module replacement for real-time updates
- Use source maps for easier debugging
- Serve the application at http://localhost:3000

### Building for Production

To build the application for production:

```bash
# From the client directory
npm run build
```

This will:
- Create optimized production bundles
- Output the files to `../server/dist` directory
- Generate the following files:
  - `bundle.js` (your application code)
  - `index.html` (the HTML entry point)
  - Any assets like images in their respective folders

## Server Integration

To deploy the full application:
1. Build the client as described above
2. Start your server (run `npm start` in `/server`) application (which will serve the files from its `dist` directory)
