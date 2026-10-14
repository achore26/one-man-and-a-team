import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Format currency as USD ($)
export function formatUSD(amount) {
  const num = Number(amount) || 0;
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function generatePDFDoc(data, profile) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const primaryColor = [30, 58, 138]; // Deep Navy (#1e3a8a)
  const secondaryColor = [217, 119, 6]; // Amber / Gold (#d97706)
  const darkText = [30, 41, 59]; // Slate 800 (#1e293b)
  const mutedText = [100, 116, 139]; // Slate 500 (#64748b)
  const lightBg = [248, 250, 252]; // Slate 50 (#f8fafc)

  // 1. TOP HEADER BRANDING
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text(profile.businessName || 'ONE MAN AND A TEAM', margin, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  doc.text(profile.tagline || 'CCTV • Building & Renovation • Mechanical Services', margin, 26);

  // Contact info
  let contactY = 32;
  if (profile.phone) {
    doc.text(`Phone / WhatsApp: ${profile.phone}`, margin, contactY);
    contactY += 4.5;
  }
  if (profile.email) {
    doc.text(`Email: ${profile.email}`, margin, contactY);
    contactY += 4.5;
  }
  if (profile.address) {
    doc.text(`Service Area: ${profile.address}`, margin, contactY);
    contactY += 4.5;
  }

  // 2. RIGHT-SIDE DOCUMENT TYPE BADGE
  const docTitle = data.type === 'INVOICE' ? 'TAX INVOICE' : 'QUOTE / ESTIMATE';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...(data.type === 'INVOICE' ? primaryColor : secondaryColor));
  doc.text(docTitle, pageWidth - margin, 20, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  doc.text(`${data.type === 'INVOICE' ? 'Invoice #' : 'Quote #'}: ${data.quoteNumber || 'OMT-1001'}`, pageWidth - margin, 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  doc.text(`Date: ${data.date || new Date().toISOString().split('T')[0]}`, pageWidth - margin, 34, { align: 'right' });
  
  if (data.dueDate) {
    doc.text(`${data.type === 'INVOICE' ? 'Due Date' : 'Valid Until'}: ${data.dueDate}`, pageWidth - margin, 39, { align: 'right' });
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, 48, pageWidth - margin, 48);

  // 3. BILL TO / CUSTOMER BOX
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, 52, pageWidth - (margin * 2), 26, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, 52, pageWidth - (margin * 2), 26, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('CUSTOMER / CLIENT DETAILS', margin + 4, 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkText);
  doc.text(data.customerName || 'Valued Customer', margin + 4, 65);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  const custPhone = data.customerPhone ? `Phone: ${data.customerPhone}` : '';
  const custAddr = data.customerAddress ? `Site / Address: ${data.customerAddress}` : '';
  
  if (custPhone && custAddr) {
    doc.text(`${custPhone}  |  ${custAddr}`, margin + 4, 72);
  } else {
    doc.text(custPhone || custAddr || 'Site Details Provided on Record', margin + 4, 72);
  }

  // 4. ITEMS TABLE
  const tableRows = (data.items || []).map((item, index) => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const total = qty * price;
    return [
      (index + 1).toString(),
      item.description || 'Service / Item Description',
      qty.toString(),
      formatUSD(price),
      formatUSD(total)
    ];
  });

  autoTable(doc, {
    startY: 83,
    head: [['#', 'DESCRIPTION / ITEM DETAILS', 'QTY', 'UNIT PRICE', 'AMOUNT (USD)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
      cellPadding: 3
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: darkText,
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: margin, right: margin }
  });

  let currentY = doc.lastAutoTable.finalY + 6;

  // Check if we need page overflow protection
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 20;
  }

  // 5. TOTALS CALCULATION & BREAKDOWN (Right-aligned)
  const subtotal = (data.items || []).reduce((sum, item) => {
    return sum + ((Number(item.qty) || 1) * (Number(item.price) || 0));
  }, 0);

  const discount = Number(data.discount) || 0;
  const taxPercent = Number(data.taxPercent) || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const grandTotal = taxableAmount + taxAmount;
  const depositPercent = Number(data.depositPercent) || 0;
  const depositAmount = (grandTotal * depositPercent) / 100;

  const totalsBoxWidth = 85;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  // Totals Breakdown
  doc.setFontSize(9);
  doc.setTextColor(...darkText);

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsBoxX, currentY);
  doc.text(formatUSD(subtotal), pageWidth - margin, currentY, { align: 'right' });
  currentY += 5;

  // Discount (if any)
  if (discount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text('Discount:', totalsBoxX, currentY);
    doc.text(`-${formatUSD(discount)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;
    doc.setTextColor(...darkText);
  }

  // Tax (if any)
  if (taxPercent > 0) {
    doc.text(`Tax (${taxPercent}%):`, totalsBoxX, currentY);
    doc.text(formatUSD(taxAmount), pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;
  }

  // Total Box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(totalsBoxX - 2, currentY, totalsBoxWidth + 2, 9, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL (USD):', totalsBoxX + 2, currentY + 6);
  doc.text(formatUSD(grandTotal), pageWidth - margin - 2, currentY + 6, { align: 'right' });
  currentY += 13;

  // Optional Deposit breakdown
  if (depositPercent > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...secondaryColor);
    doc.text(`Deposit Required (${depositPercent}%):`, totalsBoxX, currentY);
    doc.text(formatUSD(depositAmount), pageWidth - margin, currentY, { align: 'right' });
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedText);
    doc.text('Balance on Completion:', totalsBoxX, currentY);
    doc.text(formatUSD(grandTotal - depositAmount), pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;
  }

  // 6. NOTES, PAYMENT INFO & TERMS (Left side or below)
  let notesY = doc.lastAutoTable.finalY + 6;
  const notesWidth = pageWidth - margin - totalsBoxWidth - 10;

  // Payment Instructions
  if (profile.paymentInfo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text('PAYMENT DETAILS:', margin, notesY);
    notesY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkText);
    const splitPayment = doc.splitTextToSize(profile.paymentInfo, notesWidth);
    doc.text(splitPayment, margin, notesY);
    notesY += (splitPayment.length * 3.8) + 4;
  }

  // Project Notes / Customer Terms
  const termsText = data.notes || profile.defaultTerms;
  if (termsText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text('TERMS & CONDITIONS:', margin, notesY);
    notesY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedText);
    const splitTerms = doc.splitTextToSize(termsText, notesWidth);
    doc.text(splitTerms, margin, notesY);
  }

  // 7. FOOTER
  const footerY = pageHeight - 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  doc.text('Thank you for trusting One Man and a Team!', margin, footerY);

  doc.setFont('helvetica', 'italic');
  doc.text('Authorized Service • Field & On-Site Support', pageWidth - margin, footerY, { align: 'right' });

  return doc;
}

export function getPDFBlob(data, profile) {
  const doc = generatePDFDoc(data, profile);
  return doc.output('blob');
}

export function downloadPDF(data, profile) {
  const doc = generatePDFDoc(data, profile);
  const cleanName = (data.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const num = data.quoteNumber || 'OMT-1001';
  const filename = `${num}_${cleanName}.pdf`;
  doc.save(filename);
}

export async function sharePDF(data, profile) {
  const blob = getPDFBlob(data, profile);
  const cleanName = (data.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const num = data.quoteNumber || 'OMT-1001';
  const filename = `${num}_${cleanName}.pdf`;
  const file = new File([blob], filename, { type: 'application/pdf' });

  const shareText = `Hello ${data.customerName || ''}, here is your ${data.type === 'INVOICE' ? 'Invoice' : 'Quote'} ${num} from One Man and a Team. Total: ${formatUSD(data.total || 0)}`;

  // Check if Web Share API with files is supported (iOS Safari & Android Chrome)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `${data.type === 'INVOICE' ? 'Invoice' : 'Quote'} - One Man and a Team`,
        text: shareText,
        files: [file]
      });
      return { success: true, method: 'share_api' };
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Share API failed, falling back:', err);
      } else {
        return { success: false, aborted: true };
      }
    }
  }

  // Fallback 1: Download the PDF
  downloadPDF(data, profile);

  // Fallback 2: If phone number is available, offer direct WhatsApp message
  let waNumber = (data.customerPhone || '').replace(/[^0-9]/g, '');
  const waUrl = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(shareText)}`
    : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return { success: true, method: 'download_and_whatsapp', waUrl };
}
