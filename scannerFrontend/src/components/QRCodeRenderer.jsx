import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export const VILLAGKART_ICON_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg width="64" height="64" viewBox="2.5 11.8 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M25.3731 14C25.8481 14.1341 26.3469 14.195 26.8219 14.3291C29.6837 15.1457 32.7594 18.4733 32.7594 21.6423V26.7251H39.9675C40.3594 26.7251 40.9294 27.4198 41.0481 27.7855C41.1669 28.1511 41.0481 28.3218 41.0481 28.5777C40.9954 28.6392 40.9623 28.7158 40.9531 28.7971C40.4188 35.5619 38.5781 42.3632 37.9013 49.128C37.6513 50.3164 37.0387 51.392 36.1524 52.1986C35.2662 53.0052 34.1525 53.5008 32.9731 53.6134C26.62 53.5403 21.6325 53.7841 15.3031 53.4916C14.295 53.2545 13.3716 52.7328 12.6371 51.9854C11.9027 51.238 11.3865 50.2947 11.1469 49.2621L8 27.8586C8.06587 27.5935 8.19801 27.3506 8.38337 27.1539C8.56873 26.9572 8.80088 26.8136 9.05687 26.7372H16.2175V21.6545C16.2175 17.937 20.16 14.3413 23.6156 14H25.3731ZM30.0281 26.7372V21.8617C30.0281 19.3265 27.1781 16.9862 24.8269 16.8644C22.2262 16.7303 19.0081 19.034 19.0081 21.8617V26.7372H30.0281Z" fill="#00891D"/>
  <path d="M17.6719 32.1987H21.175L21.2106 39.8166L35.5319 28.5664L17.8144 47.9709L17.6719 32.1987Z" fill="white"/>
  <path d="M26.9906 39.9014C27.0856 40.0476 34.2344 47.9703 34.2344 47.9703H29.4844L24.7344 42.522L26.9906 39.9014Z" fill="#F5841F"/>
</svg>`)}`;

export const QRCodeRenderer = ({
  value = 'https://villagkart.com',
  fgColor = '#00891D',
  bgColor = '#FFFFFF',
  errorCorrection = 'Q',
  size = 200,
  hasCtaFrame = true,
  ctaText = 'SCAN TO DOWNLOAD',
  campaignTitle = '',
  supportingText = '',
  showLogo = true,
  logoSrc = '/villagekart_icon.svg',
  quietZone,
  className = '',
  style = {},
  onDataUrlGenerated = null,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    if (!canvasRef.current) return;

    // Helper to load logo image safely with infallible inline SVG fallback
    const loadLogo = () => {
      if (!showLogo) return Promise.resolve(null);
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          const fallback = new Image();
          fallback.onload = () => resolve(fallback);
          fallback.onerror = () => resolve(null);
          fallback.src = VILLAGKART_ICON_DATA_URL;
        };
        img.src = logoSrc || '/villagekart_icon.svg';
      });
    };

    // Sanitize value to encode
    const qrData = (typeof value === 'string' && value.trim()) 
      ? value.trim() 
      : 'https://villagkart.com';

    // Critical scannability rule:
    // If center logo is enabled, always enforce Error Correction Level 'H' (30% recovery)
    // so the center logo does NOT corrupt the QR matrix or prevent phone camera scanning.
    const effectiveErrorCorrection = showLogo ? 'H' : (errorCorrection || 'Q');

    // Quiet zone (margin): Standard QR specifications require at least 2 modules for clean detection.
    const effectiveMargin = typeof quietZone === 'number' 
      ? quietZone 
      : 2;

    // Render core QR onto an offscreen canvas at high resolution for maximum module clarity
    const qrCanvas = document.createElement('canvas');
    const internalRenderSize = Math.max(Math.round(size * 2), 240);

    QRCode.toCanvas(
      qrCanvas,
      qrData,
      {
        width: internalRenderSize,
        margin: effectiveMargin,
        color: {
          dark: fgColor || '#00891D',
          light: bgColor || '#FFFFFF',
        },
        errorCorrectionLevel: effectiveErrorCorrection,
      },
      async (error) => {
        if (error) {
          console.error('QR generation error:', error);
          return;
        }
        if (isCancelled || !canvasRef.current) return;

        let logoImg = null;
        if (showLogo) {
          logoImg = await loadLogo();
        }
        if (isCancelled || !canvasRef.current) return;

        const mainCanvas = canvasRef.current;
        const ctx = mainCanvas.getContext('2d');
        if (!ctx) return;

        // Frame calculations
        // When hasCtaFrame is false, total dimensions match `size` with zero extra card padding
        const padding = hasCtaFrame ? 14 : 0;
        const topHeaderHeight = hasCtaFrame && (campaignTitle || ctaText) ? 44 : 0;
        const bottomFooterHeight = hasCtaFrame && (supportingText || ctaText || campaignTitle) ? 38 : 0;

        const totalWidth = size + padding * 2;
        const totalHeight = size + topHeaderHeight + bottomFooterHeight;

        // High-DPI crisp rendering
        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        mainCanvas.width = Math.round(totalWidth * dpr);
        mainCanvas.height = Math.round(totalHeight * dpr);
        mainCanvas.style.width = `${totalWidth}px`;
        mainCanvas.style.height = `${totalHeight}px`;

        ctx.save();
        ctx.scale(dpr, dpr);

        if (hasCtaFrame) {
          // Draw outer card/frame background
          ctx.fillStyle = bgColor || '#FFFFFF';
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(0, 0, totalWidth, totalHeight, 10);
            ctx.fill();
          } else {
            ctx.fillRect(0, 0, totalWidth, totalHeight);
          }

          // Outer card border
          ctx.strokeStyle = '#E5E7EB';
          ctx.lineWidth = 1.5;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(0, 0, totalWidth, totalHeight, 10);
            ctx.stroke();
          } else {
            ctx.strokeRect(0, 0, totalWidth, totalHeight);
          }

          // Draw Top CTA Bar
          if (ctaText) {
            ctx.fillStyle = fgColor || '#00891D';
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(padding, 10, size, 28, 6);
              ctx.fill();
            } else {
              ctx.fillRect(padding, 10, size, 28);
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11.5px "Segoe UI", -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ctaText.toUpperCase(), totalWidth / 2, 24);
          }
        } else {
          // Standalone QR code: clean background matching bgColor
          ctx.fillStyle = bgColor || '#FFFFFF';
          ctx.fillRect(0, 0, totalWidth, totalHeight);
        }

        // Draw the QR Code matrix smoothly onto main canvas
        const qrY = topHeaderHeight;
        ctx.imageSmoothingEnabled = false; // Keep QR modules razor-sharp
        ctx.drawImage(qrCanvas, padding, qrY, size, size);
        ctx.imageSmoothingEnabled = true;

        // Center Logo overlay if showLogo is true
        // Keep logo badge area <= 5% of QR area to ensure 100% reliable scanability with Error Correction 'H'
        if (showLogo) {
          const centerX = padding + size / 2;
          const centerY = qrY + size / 2;

          if (logoImg) {
            const naturalW = logoImg.naturalWidth || logoImg.width || 48;
            const naturalH = logoImg.naturalHeight || logoImg.height || 48;
            const aspect = naturalW / naturalH;
            const isWide = aspect > 1.4;

            if (isWide) {
              // Compact white pill for wide wordmark logos
              const badgeW = Math.min(Math.round(size * 0.30), size - 20);
              const badgeH = Math.round(badgeW / aspect + 4);
              const badgeR = Math.round(badgeH / 2);
              const badgeX = Math.round(centerX - badgeW / 2);
              const badgeY = Math.round(centerY - badgeH / 2);

              // Subtle shadow for clean edge definition
              ctx.save();
              ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
              ctx.shadowBlur = 2;
              ctx.shadowOffsetY = 1;
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeR);
              } else {
                ctx.rect(badgeX, badgeY, badgeW, badgeH);
              }
              ctx.fill();
              ctx.restore();

              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1.5;
              if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeR);
                ctx.stroke();
              }

              ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
              ctx.lineWidth = 1;
              if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeR);
                ctx.stroke();
              }

              // Logo scaled to fill the pill snugly with minimal whitespace
              const maxW = badgeW - 4;
              const maxH = badgeH - 2;
              let drawW = maxW;
              let drawH = drawW / aspect;
              if (drawH > maxH) {
                drawH = maxH;
                drawW = drawH * aspect;
              }
              const drawX = Math.round(centerX - drawW / 2);
              const drawY = Math.round(centerY - drawH / 2);
              ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
            } else {
              // Clean square white background aligned with QR matrix geometry
              const squareSize = Math.round(size * 0.25);
              const squareX = Math.round(centerX - squareSize / 2);
              const squareY = Math.round(centerY - squareSize / 2);
              const cornerRadius = Math.max(Math.round(squareSize * 0.14), 4); // subtle rounded square

              // Subtle shadow for clean contrast
              ctx.save();
              ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
              ctx.shadowBlur = 3;
              ctx.shadowOffsetY = 1;
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(squareX, squareY, squareSize, squareSize, cornerRadius);
              } else {
                ctx.rect(squareX, squareY, squareSize, squareSize);
              }
              ctx.fill();
              ctx.restore();

              // Thin crisp white border
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(squareX, squareY, squareSize, squareSize, cornerRadius);
              } else {
                ctx.rect(squareX, squareY, squareSize, squareSize);
              }
              ctx.stroke();

              // Clean outline
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(squareX, squareY, squareSize, squareSize, cornerRadius);
              } else {
                ctx.rect(squareX, squareY, squareSize, squareSize);
              }
              ctx.stroke();

              // Prominent logo filling the square cleanly
              const maxDim = Math.round(squareSize * 0.82);
              let drawW = maxDim;
              let drawH = drawW / aspect;
              if (drawH > maxDim) {
                drawH = maxDim;
                drawW = drawH * aspect;
              }
              const drawX = Math.round(centerX - drawW / 2);
              const drawY = Math.round(centerY - drawH / 2);
              ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
            }
          } else {
            // Clean VillagKart fallback square badge with large bold VK text
            const squareSize = Math.round(size * 0.25);
            const squareX = Math.round(centerX - squareSize / 2);
            const squareY = Math.round(centerY - squareSize / 2);
            const cornerRadius = Math.max(Math.round(squareSize * 0.14), 4);

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetY = 1;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(squareX, squareY, squareSize, squareSize, cornerRadius);
            } else {
              ctx.rect(squareX, squareY, squareSize, squareSize);
            }
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(squareX, squareY, squareSize, squareSize, cornerRadius);
            } else {
              ctx.rect(squareX, squareY, squareSize, squareSize);
            }
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(squareX, squareY, squareSize, squareSize, cornerRadius);
            } else {
              ctx.rect(squareX, squareY, squareSize, squareSize);
            }
            ctx.stroke();

            ctx.fillStyle = fgColor || '#00891D';
            ctx.font = `800 ${Math.max(Math.round(squareSize * 0.52), 11)}px "Segoe UI", -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('VK', centerX, centerY);
          }
        }

        // Draw Bottom Supporting Text if available and frame is enabled
        if (hasCtaFrame && (supportingText || campaignTitle)) {
          ctx.fillStyle = '#6B7280';
          ctx.font = '500 11px "Segoe UI", -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const bottomText = supportingText || campaignTitle;
          ctx.fillText(bottomText.substring(0, 36), totalWidth / 2, totalHeight - 16);
        }

        ctx.restore();

        if (onDataUrlGenerated) {
          onDataUrlGenerated(mainCanvas.toDataURL('image/png'));
        }
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [
    value,
    fgColor,
    bgColor,
    errorCorrection,
    size,
    hasCtaFrame,
    ctaText,
    campaignTitle,
    supportingText,
    showLogo,
    logoSrc,
    quietZone,
    onDataUrlGenerated,
  ]);

  return (
    <div
      className={`qr-render-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          borderRadius: hasCtaFrame ? '10px' : '0px',
          boxShadow: hasCtaFrame ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
          background: bgColor || '#FFFFFF',
          margin: '0 auto',
        }}
      />
    </div>
  );
};

export default QRCodeRenderer;
