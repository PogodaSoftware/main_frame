const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 5000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

const PORTFOLIO_DIR = path.join(__dirname, 'Frontend/portfolioResume/dist/portfolio-resume-frontend/browser');
const BEAUTY_DIR = path.join(__dirname, 'Frontend/beautyApp/dist/beauty-app/browser');

app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).end();
      }
    }
  }
}));

app.use('/pogoda/beauty', express.static(BEAUTY_DIR));

app.get(['/pogoda/beauty', '/pogoda/beauty/*'], (req, res) => {
  res.sendFile(path.join(BEAUTY_DIR, 'index.html'));
});

app.use('/kevin', express.static(PORTFOLIO_DIR));

app.get(['/kevin', '/kevin/*'], (req, res) => {
  res.sendFile(path.join(PORTFOLIO_DIR, 'index.html'));
});

app.use(express.static(PORTFOLIO_DIR));

app.get('*', (req, res) => {
  res.sendFile(path.join(PORTFOLIO_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Unified server running on port ${PORT}`);
  console.log(`  Portfolio → ${PORTFOLIO_DIR}`);
  console.log(`  Beauty    → ${BEAUTY_DIR}`);
  console.log(`  API proxy → ${BACKEND_URL}`);
});
