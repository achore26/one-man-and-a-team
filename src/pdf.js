import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Format currency as USD ($X,XXX.XX)
export function formatUSD(amount) {
  const num = Number(amount) || 0;
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

let cachedLogoPng = null;

export async function prefetchLogo() {
  if (cachedLogoPng) return cachedLogoPng;
  try {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 512, 512);
        cachedLogoPng = canvas.toDataURL('image/png');
        resolve(cachedLogoPng);
      };
      img.onerror = () => resolve(null);
      img.src = './logo.svg';
    });
  } catch (e) {
    return null;
  }
}

export function generatePDFDoc(data, profile, logoBase64 = null) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Colors matching Material 3 & Brand Identity
  const darkNavy = [15, 23, 42];     // #0F172A
  const blueprintBlue = [30, 58, 138]; // #1E3A8A
  const slateText = [51, 65, 85];     // #334155
  const mutedSlate = [100, 116, 139]; // #64748B
  const hairline = [226, 232, 240];   // #E2E8F0
  const bgLight = [248, 250, 252];    // #F8FAFC
  const amberAccent = [217, 119, 6];  // #D97706

  const logoImg = logoBase64 || cachedLogoPng;

  // 1. TOP HEADER BRAND SECTION
  let headerTextX = margin;
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', margin, 12, 20, 20);
      headerTextX = margin + 24;
    } catch (e) {
      // Fallback without image
      headerTextX = margin;
    }
  }

  // Company Name & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...darkNavy);
  doc.text((profile.businessName || 'ONE MAN & A TEAM').toUpperCase(), headerTextX, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...amberAccent);
  doc.text('TECHNICAL & CONTRACTING SERVICES', headerTextX, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedSlate);
  const contactParts = [];
  if (profile.phone) contactParts.push(`Tel: ${profile.phone}`);
  if (profile.email) contactParts.push(profile.email);
  if (profile.address) contactParts.push(profile.address);
  doc.text(contactParts.join('  |  '), headerTextX, 28);

  // 2. DOCUMENT TYPE BADGE & META (Right Side)
  const isInvoice = data.type === 'INVOICE';
  const badgeTitle = isInvoice ? 'TAX INVOICE' : 'OFFICIAL ESTIMATE';
  const badgeBg = isInvoice ? darkNavy : [241, 245, 249];
  const badgeText = isInvoice ? [255, 255, 255] : darkNavy;

  // Badge Pill
  const badgeWidth = 46;
  const badgeHeight = 7.5;
  const badgeX = pageWidth - margin - badgeWidth;
  doc.setFillColor(...badgeBg);
  doc.roundedRect(badgeX, 13, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
  if (!isInvoice) {
    doc.setDrawColor(...hairline);
    doc.roundedRect(badgeX, 13, badgeWidth, badgeHeight, 1.5, 1.5, 'S');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...badgeText);
  doc.text(badgeTitle, badgeX + (badgeWidth / 2), 18, { align: 'center' });

  // Document Number & Dates
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...darkNavy);
  doc.text(`REF: ${data.quoteNumber || 'OMT-1001'}`, pageWidth - margin, 26, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedSlate);
  const issueDate = data.date || new Date().toISOString().split('T')[0];
  doc.text(`Issue Date: ${issueDate}`, pageWidth - margin, 31, { align: 'right' });

  if (data.dueDate) {
    doc.text(`${isInvoice ? 'Due Date' : 'Valid Until'}: ${data.dueDate}`, pageWidth - margin, 35.5, { align: 'right' });
  }

  // Horizontal Hairline Divider
  doc.setDrawColor(...hairline);
  doc.setLineWidth(0.4);
  doc.line(margin, 40, pageWidth - margin, 40);

  // 3. BILL TO / CLIENT INFORMATION PANEL
  doc.setFillColor(...bgLight);
  doc.roundedRect(margin, 44, pageWidth - (margin * 2), 24, 2, 2, 'F');
  doc.setDrawColor(...hairline);
  doc.roundedRect(margin, 44, pageWidth - (margin * 2), 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...amberAccent);
  doc.text('CLIENT / RECIPIENT INFORMATION', margin + 5, 49.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...darkNavy);
  doc.text(data.customerName || 'Client / Valued Customer', margin + 5, 55.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...slateText);
  const phoneText = data.customerPhone ? `Phone: ${data.customerPhone}` : '';
  const addrText = data.customerAddress ? `Site Address: ${data.customerAddress}` : '';
  const metaCombined = [phoneText, addrText].filter(Boolean).join('   •   ') || 'Site Information on Official Project File';
  doc.text(metaCombined, margin + 5, 62);

  // 4. ITEMS TABLE (AutoTable)
  const tableRows = (data.items || []).map((item, index) => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const total = qty * price;
    return [
      (index + 1).toString().padStart(2, '0'),
      item.description || 'General Technical / Contracting Service',
      qty.toString(),
      formatUSD(price),
      formatUSD(total)
    ];
  });

  autoTable(doc, {
    startY: 72,
    head: [['#', 'DESCRIPTION OF MATERIALS & SERVICES', 'QTY', 'UNIT PRICE', 'AMOUNT (USD)']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: darkNavy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3.5,
      halign: 'left'
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: slateText,
      cellPadding: 3.8,
      lineColor: hairline,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: mutedSlate },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: darkNavy }
    },
    alternateRowStyles: {
      fillColor: bgLight
    },
    margin: { left: margin, right: margin }
  });

  let currentY = doc.lastAutoTable.finalY + 6;

  // Protect page overflow
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = 20;
  }

  // 5. TOTALS BREAKDOWN (Right Aligned)
  const subtotal = (data.items || []).reduce((sum, item) => {
    return sum + ((Number(item.qty) || 1) * (Number(item.price) || 0));
  }, 0);

  const discount = Number(data.discount) || 0;
  const taxPercent = Number(data.taxPercent) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = (taxable * taxPercent) / 100;
  const grandTotal = taxable + taxAmount;
  const depositPercent = Number(data.depositPercent) || 0;
  const depositAmount = (grandTotal * depositPercent) / 100;

  const totalsBoxWidth = 84;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  doc.setFontSize(8.5);

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateText);
  doc.text('Subtotal:', totalsBoxX, currentY);
  doc.text(formatUSD(subtotal), pageWidth - margin, currentY, { align: 'right' });
  currentY += 5;

  // Discount
  if (discount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text('Discount:', totalsBoxX, currentY);
    doc.text(`-${formatUSD(discount)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;
    doc.setTextColor(...slateText);
  }

  // Tax
  if (taxPercent > 0) {
    doc.text(`Tax (${taxPercent}%):`, totalsBoxX, currentY);
    doc.text(formatUSD(taxAmount), pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;
  }

  // Grand Total Block
  doc.setFillColor(...darkNavy);
  doc.roundedRect(totalsBoxX - 2, currentY, totalsBoxWidth + 2, 9.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL (USD):', totalsBoxX + 2, currentY + 6.3);
  doc.text(formatUSD(grandTotal), pageWidth - margin - 2, currentY + 6.3, { align: 'right' });
  currentY += 13.5;

  // Deposit Callout
  if (depositPercent > 0) {
    doc.setFillColor(254, 243, 199); // Amber light
    doc.setDrawColor(252, 211, 77);
    doc.roundedRect(totalsBoxX - 2, currentY, totalsBoxWidth + 2, 8, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(146, 64, 14); // Amber 800
    doc.text(`${depositPercent}% Advance Deposit:`, totalsBoxX + 1, currentY + 5.2);
    doc.text(formatUSD(depositAmount), pageWidth - margin - 2, currentY + 5.2, { align: 'right' });
    currentY += 11;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...mutedSlate);
    doc.text('Balance Due on Sign-off:', totalsBoxX, currentY);
    doc.text(formatUSD(grandTotal - depositAmount), pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;
  }

  // 6. PAYMENT INSTRUCTIONS & TERMS (Left Side)
  let notesY = doc.lastAutoTable.finalY + 6;
  const notesWidth = pageWidth - margin - totalsBoxWidth - 12;

  // Payment Details
  if (profile.paymentInfo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...darkNavy);
    doc.text('PAYMENT INSTRUCTIONS:', margin, notesY);
    notesY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slateText);
    const splitPayment = doc.splitTextToSize(profile.paymentInfo, notesWidth);
    doc.text(splitPayment, margin, notesY);
    notesY += (splitPayment.length * 3.6) + 4;
  }

  // Terms and Conditions
  const termsText = data.notes || profile.defaultTerms;
  if (termsText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...darkNavy);
    doc.text('STANDARD TERMS & WARRANTIES:', margin, notesY);
    notesY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...mutedSlate);
    const splitTerms = doc.splitTextToSize(termsText, notesWidth);
    doc.text(splitTerms, margin, notesY);
  }

  // 7. SIGNATURE BLOCK
  const signY = pageHeight - 24;
  doc.setDrawColor(...hairline);
  doc.setLineWidth(0.4);

  // Client Signature
  doc.line(margin, signY, margin + 65, signY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...mutedSlate);
  doc.text('Client Acceptance Signature & Date', margin, signY + 3.5);

  // Authorized Contractor Signature
  const authX = pageWidth - margin - 65;
  doc.line(authX, signY, pageWidth - margin, signY);
  doc.text('Authorized Representative / OMT', authX, signY + 3.5);

  // 8. FOOTER
  const footerY = pageHeight - 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...mutedSlate);
  doc.text('One Man & A Team  •  Field Contracting & Technical Solutions', margin, footerY);
  doc.text(`Generated by OMT Pro  •  Page 1 of 1`, pageWidth - margin, footerY, { align: 'right' });

  return doc;
}

export async function getPDFBlob(data, profile) {
  const logo = await prefetchLogo();
  const doc = generatePDFDoc(data, profile, logo);
  return doc.output('blob');
}

export async function downloadPDF(data, profile) {
  const logo = await prefetchLogo();
  const doc = generatePDFDoc(data, profile, logo);
  const cleanName = (data.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const num = data.quoteNumber || 'OMT-1001';
  doc.save(`${num}_${cleanName}.pdf`);
}

export async function sharePDF(data, profile) {
  const blob = await getPDFBlob(data, profile);
  const cleanName = (data.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const num = data.quoteNumber || 'OMT-1001';
  const filename = `${num}_${cleanName}.pdf`;
  const file = new File([blob], filename, { type: 'application/pdf' });

  const shareText = `Hello ${data.customerName || ''}, please find your official ${data.type === 'INVOICE' ? 'Invoice' : 'Quote'} ${num} from One Man and a Team. Total: ${formatUSD(data.total || 0)}`;

  // Native Web Share API with file support
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `${data.type === 'INVOICE' ? 'Invoice' : 'Quote'} ${num} - One Man & A Team`,
        text: shareText,
        files: [file]
      });
      return { success: true, method: 'share_api' };
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Share API failed:', err);
      } else {
        return { success: false, aborted: true };
      }
    }
  }

  // Fallback: Download file & open WhatsApp
  await downloadPDF(data, profile);
  let waNumber = (data.customerPhone || '').replace(/[^0-9]/g, '');
  const waUrl = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(shareText)}`
    : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return { success: true, method: 'download_and_whatsapp', waUrl };
}
