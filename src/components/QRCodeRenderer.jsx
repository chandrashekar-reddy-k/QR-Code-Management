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
  className = '',
  onDataUrlGenerated = null,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

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
      (error) => {
        if (error) {
          console.error('QR generation error:', error);
          return;
        }

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
        ctx.roundRect ? ctx.roundRect(0, 0, totalWidth, totalHeight, 10) : ctx.rect(0, 0, totalWidth, totalHeight);
        ctx.fill();

        // Outer border
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1.5;
        ctx.stroke();

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
          const logoSize = size * 0.22;
          const logoX = (totalWidth - logoSize) / 2;
          const logoY = qrY + (size - logoSize) / 2;

          // Logo Background badge (circular protection)
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(totalWidth / 2, qrY + size / 2, logoSize * 0.65, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = fgColor || '#00891D';
          ctx.lineWidth = 2;
          ctx.stroke();

          // VillagKart "V" brand emblem
          ctx.fillStyle = fgColor || '#00891D';
          ctx.font = `bold ${Math.round(logoSize * 0.65)}px "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('V', totalWidth / 2, qrY + size / 2);
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
