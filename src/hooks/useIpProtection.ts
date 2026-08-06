import { useEffect } from "react";

export function useIpProtection(active: boolean) {
  useEffect(() => {
    const isBypass = localStorage.getItem("dev_bypass_ip_protection") === "true";
    if (!active || isBypass) {
      // Clean up any remaining overlays if they exist
      const blocker = document.getElementById("security-focus-blocker");
      if (blocker) blocker.remove();
      document.body.style.filter = "none";
      const watermark = document.getElementById("security-watermark-overlay");
      if (watermark) watermark.remove();
      const existingStyle = document.getElementById("ip-protection-style");
      if (existingStyle) existingStyle.remove();
      return;
    }

    // 1. Prevent Right-Click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Prevent Copy & Cut events
    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("Copying text is strictly prohibited for security reasons.");
    };

    // 3. Prevent Screenshot/Devtools Shortcuts & Printing
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen key
      if (e.key === "PrintScreen") {
        try {
          navigator.clipboard.writeText(""); // Clear clipboard
        } catch (err) {
          // ignore
        }
        createBlocker();
        alert("Screenshots are blocked.");
      }

      // Prevent Windows key / Cmd key immediately to pre-emptively black out screenshots
      if (e.key === "Meta" || e.keyCode === 91 || e.keyCode === 92 || e.metaKey) {
        createBlocker();
      }

      // Prevent Ctrl+P, Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        alert("Printing is disabled.");
      }

      // Prevent Inspect Element Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J)
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "C" || e.key === "c" || e.key === "J" || e.key === "j"))
      ) {
        e.preventDefault();
      }
    };

    // 4. Create and manage Blocker Overlay on Window Focus Loss
    const createBlocker = () => {
      let blocker = document.getElementById("security-focus-blocker");
      if (!blocker) {
        blocker = document.createElement("div");
        blocker.id = "security-focus-blocker";
        blocker.style.position = "fixed";
        blocker.style.top = "0";
        blocker.style.left = "0";
        blocker.style.width = "100vw";
        blocker.style.height = "100vh";
        blocker.style.backgroundColor = "#0f172a";
        blocker.style.zIndex = "99999999";
        blocker.style.display = "flex";
        blocker.style.flexDirection = "column";
        blocker.style.alignItems = "center";
        blocker.style.justifyContent = "center";
        blocker.style.color = "#ffffff";
        blocker.style.fontFamily = "sans-serif";
        blocker.style.textAlign = "center";
        blocker.style.padding = "20px";
        blocker.innerHTML = `
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">🔒 Security Blocker Active</div>
          <div style="font-size: 14px; color: #94a3b8;">Portal content is hidden when window is out of focus to prevent screenshots/screen-recording.</div>
        `;
        document.body.appendChild(blocker);
      }
      document.body.style.filter = "blur(40px)";
    };

    const removeBlocker = () => {
      const blocker = document.getElementById("security-focus-blocker");
      if (blocker) {
        blocker.remove();
      }
      document.body.style.filter = "none";
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        createBlocker();
      } else {
        removeBlocker();
      }
    };

    const handleBlur = () => {
      createBlocker();
    };

    const handleFocus = () => {
      removeBlocker();
    };

    const handleMouseLeave = () => {
      createBlocker();
    };

    const handleMouseEnter = () => {
      // Only remove blocker if window actually has focus
      if (document.hasFocus()) {
        removeBlocker();
      }
    };

    // 5. Create Repeating Watermark Overlay
    const createWatermark = () => {
      let watermark = document.getElementById("security-watermark-overlay");
      if (!watermark) {
        watermark = document.createElement("div");
        watermark.id = "security-watermark-overlay";
        watermark.style.position = "fixed";
        watermark.style.top = "0";
        watermark.style.left = "0";
        watermark.style.width = "100vw";
        watermark.style.height = "100vh";
        watermark.style.pointerEvents = "none";
        watermark.style.zIndex = "9999999";
        watermark.style.opacity = "0.06";
        watermark.style.backgroundImage = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='250' height='150' viewBox='0 0 250 150'><text x='20' y='80' fill='%23000' font-size='14' font-family='sans-serif' transform='rotate(-25 125 75)' font-weight='bold'>VILLAGKART SECURE PORTAL</text></svg>")`;
        watermark.style.backgroundRepeat = "repeat";
        document.body.appendChild(watermark);
      }
    };

    createWatermark();

    // Add global CSS class to disable text selection and highlight
    const style = document.createElement("style");
    style.id = "ip-protection-style";
    style.innerHTML = `
      body {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      @media print {
        body {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.keyCode === 91 || e.keyCode === 92) {
        // Only remove blocker if mouse is still in the document and window has focus
        if (document.hasFocus()) {
          removeBlocker();
        }
      }
    };

    // Register event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyCut);
    document.addEventListener("cut", handleCopyCut);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      // Clean up event listeners
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyCut);
      document.removeEventListener("cut", handleCopyCut);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      
      removeBlocker();
      
      const watermark = document.getElementById("security-watermark-overlay");
      if (watermark) {
        watermark.remove();
      }

      const existingStyle = document.getElementById("ip-protection-style");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [active]);
}
