import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

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
  className = '',
  onDataUrlGenerated = null,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    if (!canvasRef.current) return;

    // Helper to load logo image
    const loadLogo = () => {
      if (!showLogo) return Promise.resolve(null);
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = logoSrc || '/villagekart_icon.svg';
      });
    };

    // Render core QR onto an offscreen canvas first
    const qrCanvas = document.createElement('canvas');
    QRCode.toCanvas(
      qrCanvas,
      value || 'https://villagkart.com',
      {
        width: size,
        margin: 2,
        color: {
          dark: fgColor || '#00891D',
          light: bgColor || '#FFFFFF',
        },
        errorCorrectionLevel: errorCorrection || 'Q',
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

        // Frame calculations if hasCtaFrame is active
        const topHeaderHeight = (campaignTitle || ctaText) && hasCtaFrame ? 42 : 12;
        const bottomFooterHeight = hasCtaFrame && (supportingText || ctaText) ? 38 : 12;
        const padding = 14;

        const totalWidth = size + padding * 2;
        const totalHeight = size + topHeaderHeight + bottomFooterHeight;

        mainCanvas.width = totalWidth;
        mainCanvas.height = totalHeight;

        // Draw outer card/frame background
        ctx.fillStyle = bgColor || '#FFFFFF';
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(0, 0, totalWidth, totalHeight, 10);
          ctx.fill();
        } else {
          ctx.fillRect(0, 0, totalWidth, totalHeight);
        }

        // Outer border
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
        if (hasCtaFrame && ctaText) {
          ctx.fillStyle = fgColor || '#00891D';
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(padding, 10, size, 28, 6);
            ctx.fill();
          } else {
            ctx.fillRect(padding, 10, size, 28);
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11.5px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ctaText.toUpperCase(), totalWidth / 2, 24);
        }

        // Draw the QR Code matrix
        const qrY = topHeaderHeight;
        ctx.drawImage(qrCanvas, padding, qrY, size, size);

        // Center Logo overlay if showLogo is true
        if (showLogo) {
          const centerX = totalWidth / 2;
          const centerY = qrY + size / 2;

          if (logoImg) {
            const naturalW = logoImg.naturalWidth || logoImg.width || 48;
            const naturalH = logoImg.naturalHeight || logoImg.height || 48;
            const aspect = naturalW / naturalH;

            const isWide = aspect > 1.4;

            if (isWide) {
              // Proportional white pill for wide wordmark logos
              const badgeW = Math.round(size * 0.38);
              const badgeH = Math.round(badgeW / aspect + 10);
              const badgeR = Math.round(badgeH / 2);
              const badgeX = Math.round(centerX - badgeW / 2);
              const badgeY = Math.round(centerY - badgeH / 2);

              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeR);
              } else {
                ctx.rect(badgeX, badgeY, badgeW, badgeH);
              }
              ctx.fill();

              const maxW = badgeW - 10;
              const maxH = badgeH - 6;
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
              // White circular empty space for clean quiet zone & high visibility (circle size preserved)
              const circleRadius = Math.round(size * 0.175);
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
              ctx.fill();

              // Increased logo size for bold brand visibility
              const maxDim = Math.round(size * 0.30);
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
            // Clean VillagKart fallback emblem badge with white circular empty space
            const circleRadius = Math.round(size * 0.175);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = fgColor || '#00891D';
            ctx.font = `bold ${Math.round(circleRadius * 0.85)}px "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('VK', centerX, centerY);
          }
        }

        // Draw Bottom Supporting Text if available
        if (hasCtaFrame && (supportingText || campaignTitle)) {
          ctx.fillStyle = '#6B7280';
          ctx.font = '500 11px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const bottomText = supportingText || campaignTitle;
          ctx.fillText(bottomText.substring(0, 36), totalWidth / 2, totalHeight - 16);
        }

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
    onDataUrlGenerated,
  ]);

  return (
    <div className={`qr-render-container ${className}`} style={{ textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          background: bgColor,
        }}
      />
    </div>
  );
};
