# iHatePDF

A modern, browser-based PDF manipulation tool that makes working with PDFs less painful. All processing happens locally in your browser - no files are ever uploaded to any server.

## Features

- **Select Pages**: Choose specific pages from your PDF to keep or remove
- **Crop**: Crop pages to focus on the content that matters
- **Export PDF**: Save your modified PDF with various compression options
- **Export Image**: Convert pages to JPG or PNG with adjustable DPI and quality
- **Export SVG**: Convert pages to SVG format (bundled as ZIP for multiple pages)
- **Flutter Code**: Generate Flutter widget code for PDF page viewing (Coming Soon - Open for Contributors)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, bun, or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/harshammg/iHatePDF.git
cd pdf-wizard
```

2. Install dependencies:
```bash
npm install
# or
bun install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
bun run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
# or
bun run build
# or
yarn build
```

After building, you can serve the `dist/client` directory with any static file server.

## Configuration

### Changing File Size Limit

By default, the application accepts PDF files up to 100MB. To change this limit:

1. Open `src/components/upload-zone.tsx`
2. Locate the `MAX_BYTES` constant on line 6:
```typescript
const MAX_BYTES = 100 * 1024 * 1024; // 100MB
```
3. Change the value to your desired limit in bytes:
```typescript
const MAX_BYTES = 200 * 1024 * 1024; // 200MB
```
4. Update the UI text on line 108 to reflect the new limit:
```typescript
Max 200MB. We're not magicians.
```

## Technology Stack

- **React 19**: UI framework
- **TypeScript**: Type safety
- **TanStack Start**: Full-stack React framework
- **Tailwind CSS**: Styling
- **pdf-lib**: PDF manipulation
- **pdfjs-dist**: PDF rendering
- **JSZip**: ZIP file creation
- **Framer Motion**: Animations
- **Zustand**: State management

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Privacy

All PDF processing happens entirely in your browser. Your files are never uploaded to any server. The application runs entirely client-side using WebAssembly and browser APIs.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
