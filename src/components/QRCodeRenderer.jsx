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
  quietZone,
  className = '',
  style = {},
  onDataUrlGenerated = null,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    if (!canvasRef.current) return;

    // Helper to load logo image safely
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
              // Compact circular white background (tight radius: 13.5% of QR code width)
              const circleRadius = Math.round(size * 0.135);

              // Subtle shadow for clean contrast
              ctx.save();
              ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
              ctx.shadowBlur = 3;
              ctx.shadowOffsetY = 1;
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();

              // Thin crisp white border
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
              ctx.stroke();

              // Clean outline
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
              ctx.stroke();

              // Larger logo filling the circle snugly (fills ~82% of circle diameter)
              const maxDim = Math.round(circleRadius * 1.82);
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
            // Compact VillagKart fallback emblem badge with large bold VK text
            const circleRadius = Math.round(size * 0.135);

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetY = 1;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = fgColor || '#00891D';
            ctx.font = `800 ${Math.max(Math.round(circleRadius * 1.25), 11)}px "Segoe UI", -apple-system, sans-serif`;
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
