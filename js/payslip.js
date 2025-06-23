// Payslip generation and handling functionality
let currentPayslipData = null;

// Calculate earnings, deductions and net pay
function calculateTotalPay(hours, rate, deductions) {
    const grossPay = hours * rate;
    return grossPay - deductions;
}

// Format currency values with ZAR symbol
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR'
    }).format(amount);
}
// Get all stored payslips
function getPayslipHistory() {
    const encryptedData = getFromLocalStorage(STORAGE_KEYS.PAYSLIPS);
    if (!encryptedData) return [];
    
    // Decrypt data if it's encrypted
    try {
        if (encryptedData.isEncrypted) {
            return decryptPayslipData(encryptedData.data) || [];
        }
        return encryptedData;
    } catch (error) {
        console.error('Error decrypting payslip data:', error);
        return [];
    }
}

// Save a payslip to history with encryption
function savePayslipToHistory(payslipData) {
    const payslips = getPayslipHistory();
    
    // Generate document signature
    const signature = generateDocumentSignature(payslipData);
    
    // Set document expiry (90 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90);
    
    // Create audit entry
    const auditEntry = {
        action: 'create_payslip',
        timestamp: new Date().toISOString(),
        user: localStorage.getItem('currentUser') || 'admin',
        employeeId: payslipData.idNumber
    };
    
    // Add security and metadata to payslip
    const newPayslip = {
        ...payslipData,
        id: generateUniqueId(),
        timestamp: new Date().toISOString(),
        signature: signature,
        expiryDate: expiryDate.toISOString(),
        auditTrail: [auditEntry],
        verificationCode: generateVerificationCode(payslipData),
        securityLevel: 'standard'
    };
    
    // Add to beginning of array (newest first)
    payslips.unshift(newPayslip);
    
    // Encrypt and save to storage
    const encryptedData = {
        isEncrypted: true,
        data: encryptPayslipData(payslips)
    };
    
    return saveToLocalStorage(STORAGE_KEYS.PAYSLIPS, encryptedData);
}

// Generate a unique ID for payslips
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Generate a document signature based on payslip data
function generateDocumentSignature(payslipData) {
    try {
        // Create a string from critical payslip data
        const dataString = [
            payslipData.employeeName,
            payslipData.idNumber,
            payslipData.payPeriod,
            payslipData.totalPay.toString(),
            new Date().toISOString()
        ].join('|');
        
        // Use a simple hash algorithm for demo purposes
        // In production, use a proper cryptographic hash function
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Return hash as hexadecimal
        return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
    } catch (error) {
        console.error('Error generating document signature:', error);
        return 'SIGNATURE_ERROR';
    }
}

// Generate a verification code for QR code
function generateVerificationCode(payslipData) {
    try {
        // Create a verification string with key data
        const verificationString = [
            'NEWAY',
            payslipData.idNumber,
            payslipData.payPeriod,
            formatCurrency(payslipData.totalPay).replace(/[^0-9.]/g, '')
        ].join('-');
        
        // Add checksum (simple sum of character codes)
        let checksum = 0;
        for (let i = 0; i < verificationString.length; i++) {
            checksum += verificationString.charCodeAt(i);
        }
        
        return `${verificationString}-${checksum}`;
    } catch (error) {
        console.error('Error generating verification code:', error);
        return 'VERIFICATION_ERROR';
    }
}

// Simple encryption for payslip data (for demonstration)
// In production, use a proper encryption library
function encryptPayslipData(data) {
    try {
        // Convert data to string
        const jsonString = JSON.stringify(data);
        
        // Simple XOR encryption with a fixed key (demo only)
        // In production, use proper encryption standards
        const key = 'NEWAY_SECURITY_KEY';
        let result = '';
        
        for (let i = 0; i < jsonString.length; i++) {
            const charCode = jsonString.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        
        // Return Base64 encoded string
        return btoa(result);
    } catch (error) {
        console.error('Error encrypting payslip data:', error);
        return null;
    }
}

// Decrypt payslip data
function decryptPayslipData(encryptedData) {
    try {
        // Decode Base64 string
        const encodedString = atob(encryptedData);
        
        // Reverse XOR encryption
        const key = 'NEWAY_SECURITY_KEY';
        let result = '';
        
        for (let i = 0; i < encodedString.length; i++) {
            const charCode = encodedString.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        
        // Parse JSON data
        return JSON.parse(result);
    } catch (error) {
        console.error('Error decrypting payslip data:', error);
        return null;
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

// Check if a payslip exists with matching criteria
function findPayslip(idNumber, payPeriod) {
    const payslips = getPayslipHistory();
    return payslips.find(p => 
        p.idNumber === idNumber && 
        p.payPeriod === payPeriod
    );
}
// Generate payslip from form data
function generatePayslip(event) {
    event.preventDefault();
    
    // Validate form
    const form = document.getElementById('payslipForm');
    if (!form.checkValidity()) {
        showNotification('Please fill in all required fields correctly', 'error');
        // Trigger browser's built-in validation UI
        form.reportValidity();
        return false;
    }
    
    try {
        // Get form data
        const formData = {
            employeeName: document.getElementById('employeeName').value.trim(),
            idNumber: document.getElementById('idNumber').value.trim(),
            position: document.getElementById('position').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            hoursWorked: parseFloat(document.getElementById('hoursWorked').value),
            hourlyRate: parseFloat(document.getElementById('hourlyRate').value),
            deductions: parseFloat(document.getElementById('deductions').value),
            payPeriod: document.getElementById('payPeriod').value
        };
        
        // Calculate totals
        const grossPay = formData.hoursWorked * formData.hourlyRate;
        const totalPay = calculateTotalPay(formData.hoursWorked, formData.hourlyRate, formData.deductions);
        
        // Add to form data
        formData.grossPay = grossPay;
        formData.totalPay = totalPay;
        
        // Check for existing payslip for same employee and pay period
        const existingPayslip = findPayslip(formData.idNumber, formData.payPeriod);
        if (existingPayslip) {
            if (!confirm(`A payslip already exists for ${formData.employeeName} for ${formData.payPeriod}. Generate a new one?`)) {
                return false;
            }
        }
        
        // Store current payslip data
        currentPayslipData = formData;
        
        // Generate preview
        const preview = document.getElementById('payslipPreview');
        preview.innerHTML = generatePayslipHTML(formData);
        preview.classList.add('visible');
        
        // Enable buttons
        document.getElementById('sharePayslip').disabled = false;
        document.getElementById('autofillProfile').disabled = false;
        
        // Save to history
        savePayslipToHistory(formData);
        
        // Update history view if visible
        if (document.getElementById('payslip-history').classList.contains('active')) {
            renderPayslipHistory();
        }
        
        showNotification('Payslip generated successfully');
        
        return false;
    } catch (error) {
        console.error('Error generating payslip:', error);
        showNotification('Error generating payslip. Please try again.', 'error');
        return false;
    }
}
// Generate HTML for payslip preview
function generatePayslipHTML(data) {
    // Format the pay period for display (from "2023-06" to "June 2023")
    const payPeriodDate = new Date(data.payPeriod + '-01');
    const formattedPayPeriod = payPeriodDate.toLocaleDateString('en-ZA', {
        month: 'long',
        year: 'numeric'
    });
    
    return `
        <h2>NEWAY SECURITY SERVICES - Payslip</h2>
        <div class="payslip-content">
            <div class="payslip-header">
                <p><strong>Employee Name:</strong> ${data.employeeName}</p>
                <p><strong>ID Number:</strong> ${data.idNumber}</p>
                <p><strong>Position:</strong> ${data.position}</p>
                <p><strong>Pay Period:</strong> ${formattedPayPeriod}</p>
                ${data.email ? `<p><strong>Email:</strong> ${data.email}</p>` : ''}
                ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
            </div>
            
            <div class="payslip-details">
                <p><strong>Hours Worked:</strong> ${data.hoursWorked}</p>
                <p><strong>Hourly Rate:</strong> ${formatCurrency(data.hourlyRate)}</p>
                <p><strong>Gross Pay:</strong> ${formatCurrency(data.grossPay)}</p>
                <p><strong>Deductions:</strong> ${formatCurrency(data.deductions)}</p>
                <p><strong>Net Pay:</strong> ${formatCurrency(data.totalPay)}</p>
            </div>
            
            <div class="payslip-footer">
                <p>PSIRA Registration No: 3145212</p>
                <p>STAND NO. 10111, MATSIKITSANE, R40 MAIN ROAD, ACORNHOEK 1360</p>
                <p>Contact: 079 955 0700 / 072 555 6444</p>
                <p>Generated: ${new Date().toLocaleDateString('en-ZA')}</p>
            </div>
        </div>
    `;
}
// Generate PDF for payslip with security features
function generatePDF(payslipData = null) {
    const data = payslipData || currentPayslipData;
    if (!data) {
        showNotification('No payslip data available', 'error');
        return null;
    }
    
    // Generate QR code for verification
    const generateQRCode = () => {
        try {
            // Create verification data
            const verificationData = data.verificationCode || generateVerificationCode(data);
            
            // Generate QR code using a public API
            return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationData)}`;
        } catch (error) {
            console.warn('Could not generate QR code', error);
            return null;
        }
    };
    
    // Create a promise to load the logo and QR code
    const loadImages = Promise.all([
        // Load logo
        new Promise((resolve, reject) => {
            const logoImg = new Image();
            logoImg.onload = function() {
                resolve(logoImg);
            };
            logoImg.onerror = function() {
                console.warn('Could not load logo, using text fallback');
                resolve(null);
            };
            logoImg.src = 'assets/Neway Logo.png'; // Path relative to base URL
        }),
        
        // Load QR code
        new Promise((resolve, reject) => {
            const qrCode = generateQRCode();
            if (!qrCode) {
                resolve(null);
                return;
            }
            
            const qrImg = new Image();
            qrImg.onload = function() {
                resolve(qrImg);
            };
            qrImg.onerror = function() {
                console.warn('Could not load QR code');
                resolve(null);
            };
            qrImg.src = qrCode;
        })
    ]);
    
    // Return a promise so we can use async/await for image loading
    return loadImages.then(([logoImg, qrImg]) => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Set document properties with security metadata
            doc.setProperties({
                title: `Payslip - ${data.employeeName} - ${data.payPeriod}`,
                subject: 'Employee Payslip',
                author: 'Neway Security Services',
                keywords: 'payslip, salary, employee, secure document',
                creator: 'Neway Security Payroll System',
                // Security metadata
                documentId: data.id || generateUniqueId(),
                signature: data.signature || generateDocumentSignature(data),
                creationDate: data.timestamp || new Date().toISOString(),
                expiryDate: data.expiryDate || new Date(Date.now() + 7776000000).toISOString(), // 90 days
                securityLevel: data.securityLevel || 'standard'
            });
            
            // Format the pay period
            const payPeriodDate = new Date(data.payPeriod + '-01');
            const formattedPayPeriod = payPeriodDate.toLocaleDateString('en-ZA', {
                month: 'long',
                year: 'numeric'
            });
            
            // Document constants
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margins = {
                top: 15,
                left: 15,
                right: 15
            };
            
            // Company colors - Exact brand colors from Neway Security logo
            const colors = {
                primary: [0, 0, 0],           // Black #000000
                accent: [255, 215, 0],        // Gold #FFD700
                energy: [255, 0, 0],          // Red #FF0000
                lightGray: [240, 240, 240],   // Light gray for backgrounds
                mediumGray: [150, 150, 150],  // Medium gray for borders
                white: [255, 255, 255]        // White
            };
            
            // =================== DIGITAL WATERMARK ===================
            
            // Add watermark for document security
            doc.setTextColor(240, 240, 240); // Very light gray
            doc.setFontSize(50);
            doc.setFont('helvetica', 'bold');
            
            // Rotate text for watermark
            const watermarkText = 'NEWAY SECURITY';
            
            // Draw diagonal watermarks across the page
            for (let i = 0; i < 4; i++) {
                doc.text(watermarkText, pageWidth / 2, 70 + (i * 60), {
                    align: 'center',
                    angle: 45
                });
            }
            
            // =================== HEADER SECTION ===================
            
            // Add logo if successfully loaded
            if (logoImg) {
                // Calculate logo dimensions maintaining aspect ratio (smaller size)
                const logoWidth = 35; // Reduced from 50px to 35px
                const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
                
                // Add the logo image without background
                doc.addImage(
                    logoImg, 
                    'PNG', 
                    margins.left, 
                    margins.top, 
                    logoWidth, 
                    logoHeight
                );
            } else {
                // Fallback to text logo using brand colors if image couldn't be loaded
                // "NEWAY" in red
                doc.setTextColor(...colors.energy); // Red color for "NEWAY"
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('NEWAY', margins.left + 17.5, margins.top + 10, { align: 'center' });
                
                // "SECURITY" in gold
                doc.setTextColor(...colors.accent); // Gold color for "SECURITY"
                doc.setFontSize(12);
                doc.text('SECURITY', margins.left + 17.5, margins.top + 18, { align: 'center' });
            }
        
        // Company info (right side)
        doc.setTextColor(...colors.primary);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const companyInfo = [
            'NEWAY SECURITY SERVICES',
            'STAND NO. 10111, MATSIKITSANE',
            'R40 MAIN ROAD, ACORNHOEK 1360',
            'Tel: 079 955 0700 / 072 555 6444',
            'PSIRA Registration No: 3145212'
        ];
        
        let yPos = margins.top + 5;
        companyInfo.forEach(line => {
            doc.text(line, pageWidth - margins.right, yPos, { align: 'right' });
            yPos += 5;
        });
        
        // Payslip title bar
        yPos = margins.top + 35;
        doc.setFillColor(...colors.primary); // Black background
        doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 10, 'F');
        
        // Gold border for the header bar
        doc.setDrawColor(...colors.accent); // Gold border
        doc.setLineWidth(0.5);
        doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 10);
        
        doc.setTextColor(...colors.accent); // Gold text
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('EMPLOYEE PAYSLIP', pageWidth / 2, yPos + 6.5, { align: 'center' });
        
        // =================== DOCUMENT INFO SECTION ===================
        
        yPos += 20;
        doc.setDrawColor(...colors.mediumGray);
        
        // Left side - Payslip Info
        doc.setTextColor(...colors.primary);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        doc.text('PAYSLIP NO:', margins.left, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(data.id || generateUniqueId().substring(0, 8), margins.left + 25, yPos);
        
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('PAY PERIOD:', margins.left, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(formattedPayPeriod, margins.left + 25, yPos);
        
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('ISSUE DATE:', margins.left, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString('en-ZA'), margins.left + 25, yPos);
        
        // Right side - Employee Info
        const rightColumn = pageWidth / 2 + 10;
        yPos = margins.top + 55;
        
        doc.setFont('helvetica', 'bold');
        doc.text('EMPLOYEE NAME:', rightColumn, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(data.employeeName, rightColumn + 35, yPos);
        
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('ID NUMBER:', rightColumn, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(data.idNumber, rightColumn + 35, yPos);
        
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('POSITION:', rightColumn, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(data.position, rightColumn + 35, yPos);
        
        // =================== PAYMENT DETAILS SECTION ===================
        
        yPos = margins.top + 85;
        
        // Section header with brand colors
        doc.setFillColor(...colors.primary); // Black background
        doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 8, 'F');
        
        // Gold border
        doc.setDrawColor(...colors.accent);
        doc.setLineWidth(0.5);
        doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 8);
        
        doc.setTextColor(...colors.accent); // Gold text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT DETAILS', margins.left + 5, yPos + 5.5);
        
        // Payment table header
        yPos += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        // Table headers
        const tableHeaders = ['Description', 'Hours', 'Rate', 'Amount'];
        const columnWidths = [100, 20, 30, 30];
        const startX = margins.left;
        
        tableHeaders.forEach((header, index) => {
            let xPos = startX;
            for (let i = 0; i < index; i++) {
                xPos += columnWidths[i];
            }
            doc.text(header, xPos, yPos);
        });
        
        // Horizontal line below headers
        yPos += 2;
        doc.setDrawColor(...colors.mediumGray);
        doc.line(margins.left, yPos, pageWidth - margins.right, yPos);
        
        // Table rows
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        
        // Regular hours row
        doc.text('Regular Hours', margins.left, yPos);
        doc.text(data.hoursWorked.toString(), startX + columnWidths[0], yPos);
        doc.text(formatCurrency(data.hourlyRate).replace('ZAR', 'R'), startX + columnWidths[0] + columnWidths[1], yPos);
        doc.text(formatCurrency(data.grossPay).replace('ZAR', 'R'), startX + columnWidths[0] + columnWidths[1] + columnWidths[2], yPos);
        
        // Deductions row
        yPos += 8;
        doc.text('Deductions', margins.left, yPos);
        doc.text('', startX + columnWidths[0], yPos);
        doc.text('', startX + columnWidths[0] + columnWidths[1], yPos);
        doc.text(`(${formatCurrency(data.deductions).replace('ZAR', 'R')})`, startX + columnWidths[0] + columnWidths[1] + columnWidths[2], yPos);
        
        // Horizontal line before total
        yPos += 5;
        doc.line(margins.left, yPos, pageWidth - margins.right, yPos);
        
        // Total row
        yPos += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('NET PAY', margins.left, yPos);
        doc.text(formatCurrency(data.totalPay).replace('ZAR', 'R'), startX + columnWidths[0] + columnWidths[1] + columnWidths[2], yPos);
        
        // =================== VERIFICATION SECTION ===================
        
        // Add QR code if available
        if (qrImg) {
            // QR code position (right side)
            const qrSize = 30;
            const qrX = pageWidth - margins.right - qrSize - 5;
            const qrY = yPos + 15;
            
            // Add QR code to PDF
            doc.addImage(
                qrImg,
                'PNG',
                qrX,
                qrY,
                qrSize,
                qrSize
            );
            
            // Add verification instructions
            doc.setFontSize(8);
            doc.setTextColor(...colors.primary);
            doc.setFont('helvetica', 'bold');
            doc.text('SCAN TO VERIFY', qrX + (qrSize/2), qrY - 5, { align: 'center' });
            
            doc.setFont('helvetica', 'normal');
            const verifyText = [
                'This document contains a secure',
                'verification code. Scan the QR code',
                'to verify this document\'s authenticity',
                'or visit verify.newaysecurity.co.za'
            ];
            
            let textY = qrY + qrSize + 5;
            verifyText.forEach(line => {
                doc.text(line, qrX + (qrSize/2), textY, { align: 'center' });
                textY += 4;
            });
        }
        
        // =================== COMPANY POLICIES SECTION ===================
        
        yPos += 20;
        doc.setFillColor(...colors.primary); // Black background
        doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 8, 'F');
        
        // Gold border
        doc.setDrawColor(...colors.accent);
        doc.setLineWidth(0.5);
        doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 8);
        
        doc.setTextColor(...colors.accent); // Gold text
        doc.setFontSize(10);
        doc.text('COMPANY POLICIES', margins.left + 5, yPos + 5.5);
        
        yPos += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.primary); // Black text for content
        
        // Company policies content
        const policies = [
            "• This document serves as an official record of payment for the specified period",
            "• Employees should retain this document for income tax and personal records",
            "• For any payroll queries, please contact the HR department within 7 days",
            "• All information contained in this document is confidential",
            "• Employee Reference Number: " + data.idNumber
        ];
        
        policies.forEach(policy => {
            doc.text(policy, margins.left, yPos);
            yPos += 8;
        });
        
        // =================== DOCUMENT SIGNATURE SECTION ===================
        
        yPos += 15;
        doc.setFillColor(...colors.lightGray);
        doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 20, 'F');
        
        // Add document signature and security information
        const signature = data.signature || generateDocumentSignature(data);
        const documentId = data.id || generateUniqueId();
        
        doc.setTextColor(...colors.primary);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('DOCUMENT SECURITY INFORMATION', margins.left + 5, yPos + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Document ID: ${documentId}`, margins.left + 5, yPos + 10);
        doc.text(`Digital Signature: ${signature}`, margins.left + 5, yPos + 15);
        
        // Add document expiry
        const expiryDate = data.expiryDate 
            ? new Date(data.expiryDate).toLocaleDateString('en-ZA') 
            : new Date(Date.now() + 7776000000).toLocaleDateString('en-ZA'); // 90 days
            
        doc.text(`Valid Until: ${expiryDate}`, pageWidth - margins.right - 50, yPos + 10);
        
        // =================== FOOTER SECTION ===================
        
        // Contact section with gold accent line
        yPos = 250;
        doc.setFillColor(...colors.accent); // Gold line
        doc.rect(margins.left, yPos, pageWidth - margins.left - margins.right, 0.5, 'F');
        
        yPos += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.primary);
        
        doc.text('This is a computer-generated document and requires no signature.', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 5;
        doc.text('For any payroll inquiries, please contact accounts@newaysecurity.co.za or call 079 955 0700', pageWidth / 2, yPos, { align: 'center' });
        
        // Legal footer with brand colors
        yPos = 270;
        doc.setFillColor(...colors.primary); // Black background
        doc.rect(0, yPos, pageWidth, 25, 'F');
        
        // Gold accent line at the top of footer
        doc.setFillColor(...colors.accent);
        doc.rect(0, yPos, pageWidth, 1, 'F');
        
        doc.setTextColor(...colors.white);
        yPos += 10;
        doc.setFontSize(7);
        
        const footerText = [
            'NEWAY SECURITY SERVICES | PSIRA Registration No: 3145212',
            'STAND NO. 10111, MATSIKITSANE, R40 MAIN ROAD, ACORNHOEK 1360',
            'www.newaysecurity.co.za | info@newaysecurity.co.za'
        ];
        
            footerText.forEach(line => {
                doc.text(line, pageWidth / 2, yPos, { align: 'center' });
                yPos += 5;
            });
            
            return doc;
        } catch (error) {
            console.error('Error generating PDF:', error);
            showNotification('Error generating PDF', 'error');
            return null;
        }
    }).catch(error => {
        console.error('Error loading logo:', error);
        showNotification('Error loading company logo', 'warning');
        return null;
    });
}
// Create or update employee profile from payslip data
function createProfileFromPayslip() {
    if (!currentPayslipData) {
        showNotification('Please generate a payslip first', 'warning');
        return;
    }
    
    const profileData = {
        idNumber: currentPayslipData.idNumber,
        name: currentPayslipData.employeeName,
        position: currentPayslipData.position,
        email: currentPayslipData.email || '',
        phone: currentPayslipData.phone || '',
        address: currentPayslipData.address || '',
        hourlyRate: currentPayslipData.hourlyRate,
        isNew: true
    };
    
    // Save to employee profiles
    if (saveEmployeeProfile(profileData)) {
        // Switch to employee profiles tab to show the new profile
        switchTab('employee-profiles');
    }
}

// Look up employee by ID and populate form fields
function lookupEmployee() {
    const idNumber = document.getElementById('idNumber').value.trim();
    
    if (!idNumber || idNumber.length !== 13) {
        showNotification('Please enter a valid 13-digit ID number', 'warning');
        return;
    }
    
    const employee = getEmployeeById(idNumber);
    
    if (employee) {
        // Fill form
        document.getElementById('employeeName').value = employee.name;
        document.getElementById('position').value = employee.position;
        document.getElementById('email').value = employee.email || '';
        document.getElementById('phone').value = employee.phone || '';
        document.getElementById('address').value = employee.address || '';
        document.getElementById('hourlyRate').value = employee.hourlyRate;
        
        showNotification(`Found employee: ${employee.name}`);
    } else {
        showNotification('No employee found with this ID number', 'warning');
    }
}

// Render payslip history table
function renderPayslipHistory(searchTerm = '') {
    const payslips = getPayslipHistory();
    const payslipTable = document.getElementById('payslipHistoryBody');
    const noPayslips = document.getElementById('noPayslips');
    
    if (!payslipTable) return; // Not on the dashboard page
    
    // Filter payslips if search term exists
    const filteredPayslips = payslips.filter(payslip => {
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase();
        return (
            payslip.employeeName.toLowerCase().includes(searchLower) ||
            payslip.idNumber.includes(searchTerm)
        );
    });
    
    if (filteredPayslips.length === 0) {
        payslipTable.innerHTML = '';
        noPayslips.style.display = 'block';
        return;
    }
    
    noPayslips.style.display = 'none';
    
    // Generate table rows
    payslipTable.innerHTML = filteredPayslips.map(payslip => {
        // Format the pay period
        const payPeriodDate = new Date(payslip.payPeriod + '-01');
        const formattedPayPeriod = payPeriodDate.toLocaleDateString('en-ZA', {
            month: 'long',
            year: 'numeric'
        });
        
        return `
            <tr>
                <td>${formattedPayPeriod}</td>
                <td>${payslip.employeeName}</td>
                <td>${payslip.idNumber}</td>
                <td>${formatCurrency(payslip.totalPay)}</td>
                <td>
                    <button class="btn-view" onclick="viewPayslip('${payslip.id}')">View</button>
                </td>
            </tr>
        `;
    }).join('');
}
// View a payslip from history with security checks
function viewPayslip(payslipId) {
    const payslips = getPayslipHistory();
    const payslip = payslips.find(p => p.id === payslipId);
    
    if (!payslip) {
        showNotification('Payslip not found', 'error');
        return;
    }
    
    // Check document expiry
    if (payslip.expiryDate) {
        const expiryDate = new Date(payslip.expiryDate);
        if (expiryDate < new Date()) {
            showNotification('This payslip has expired. Please contact HR for a valid copy.', 'warning');
            // Still allow viewing but with warning
        }
    }
    
    // Verify document signature
    const calculatedSignature = generateDocumentSignature(payslip);
    if (payslip.signature && payslip.signature !== calculatedSignature) {
        showNotification('Warning: Document signature verification failed. This document may have been altered.', 'error');
        // Continue with caution
    }
    
    // Create audit trail entry for viewing
    if (payslip.auditTrail) {
        payslip.auditTrail.push({
            action: 'view_payslip',
            timestamp: new Date().toISOString(),
            user: localStorage.getItem('currentUser') || 'admin'
        });
        
        // Save updated audit trail
        const payslips = getPayslipHistory();
        const index = payslips.findIndex(p => p.id === payslipId);
        if (index !== -1) {
            payslips[index] = payslip;
            
            // Encrypt and save
            const encryptedData = {
                isEncrypted: true,
                data: encryptPayslipData(payslips)
            };
            saveToLocalStorage(STORAGE_KEYS.PAYSLIPS, encryptedData);
        }
    }
    
    // Set as current payslip
    currentPayslipData = payslip;
    
    // Switch to generation tab
    switchTab('payslip-generation');
    
    // Show preview
    const preview = document.getElementById('payslipPreview');
    preview.innerHTML = generatePayslipHTML(payslip);
    preview.classList.add('visible');
    
    // Enable download button
    document.getElementById('sharePayslip').disabled = false;
    
    showNotification('Payslip loaded from history');
}

// Download PDF of current payslip
function downloadPayslipPDF() {
    if (!currentPayslipData) {
        showNotification('No payslip data available', 'error');
        return;
    }
    
    // Show loading indicator
    showNotification('Generating PDF...', 'info');
    
    generatePDF().then(doc => {
        if (!doc) return;
        
        // Format filename with employee name and period
        const employeeName = currentPayslipData.employeeName.replace(/\s+/g, '_');
        const payPeriod = currentPayslipData.payPeriod.replace('-', '_');
        const pdfName = `payslip_${employeeName}_${payPeriod}.pdf`;
        
        // Save the PDF
        doc.save(pdfName);
        showNotification('Payslip PDF downloaded successfully');
    }).catch(error => {
        console.error('Error in PDF generation process:', error);
        showNotification('Could not generate PDF. Please try again.', 'error');
    });
}
// Verify a payslip's authenticity
function verifyPayslip(verificationCode) {
    // Parse the verification code
    const parts = verificationCode.split('-');
    if (parts.length < 5) {
        return {
            valid: false,
            message: 'Invalid verification code format'
        };
    }
    
    // Extract information
    const company = parts[0];
    const idNumber = parts[1];
    const payPeriod = parts[2];
    const amount = parts[3];
    const checksum = parseInt(parts[4]);
    
    // Verify checksum
    let calculatedChecksum = 0;
    const verificationString = [company, idNumber, payPeriod, amount].join('-');
    for (let i = 0; i < verificationString.length; i++) {
        calculatedChecksum += verificationString.charCodeAt(i);
    }
    
    if (calculatedChecksum !== checksum) {
        return {
            valid: false,
            message: 'Document verification failed: Invalid checksum'
        };
    }
    
    // Look up payslip in history
    const payslips = getPayslipHistory();
    const matchingPayslip = payslips.find(p => 
        p.idNumber === idNumber && 
        p.payPeriod === payPeriod &&
        formatCurrency(p.totalPay).replace(/[^0-9.]/g, '') === amount
    );
    
    if (!matchingPayslip) {
        return {
            valid: false,
            message: 'No matching payslip found in records'
        };
    }
    
    // Check expiry
    if (matchingPayslip.expiryDate) {
        const expiryDate = new Date(matchingPayslip.expiryDate);
        if (expiryDate < new Date()) {
            return {
                valid: true,
                expired: true,
                payslip: matchingPayslip,
                message: 'Document is authentic but has expired'
            };
        }
    }
    
    return {
        valid: true,
        expired: false,
        payslip: matchingPayslip,
        message: 'Document verification successful'
    };
}

// Event handlers
document.addEventListener('DOMContentLoaded', function() {
    // Handle share button click
    const sharePayslip = document.getElementById('sharePayslip');
    if (sharePayslip) {
        sharePayslip.addEventListener('click', downloadPayslipPDF);
    }
    
    // Add ID number lookup functionality
    const idNumberInput = document.getElementById('idNumber');
    if (idNumberInput) {
        idNumberInput.addEventListener('blur', function() {
            if (this.value.trim().length === 13) {
                lookupEmployee();
            }
        });
    }
    
    // Add document verification UI
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
        // Create verification tab button
        const tabsContainer = document.querySelector('.dashboard-tabs');
        if (tabsContainer) {
            const verifyButton = document.createElement('button');
            verifyButton.className = 'tab-button';
            verifyButton.dataset.tab = 'document-verification';
            verifyButton.textContent = 'Verify Document';
            tabsContainer.appendChild(verifyButton);
            
            // Create verification tab content
            const verifyContent = document.createElement('div');
            verifyContent.id = 'document-verification';
            verifyContent.className = 'tab-content';
            verifyContent.innerHTML = `
                <h2>Verify Payslip Document</h2>
                <p>Enter the verification code from a payslip to verify its authenticity.</p>
                
                <div class="form-grid">
                    <div class="input-group">
                        <label for="verificationCode">Verification Code</label>
                        <input type="text" id="verificationCode" placeholder="NEWAY-1234567890-2023-06-12345">
                    </div>
                </div>
                
                <div class="button-group">
                    <button type="button" id="btnVerify" class="btn-generate">Verify Document</button>
                </div>
                
                <div id="verificationResult" class="verification-result"></div>
            `;
            
            dashboardContainer.appendChild(verifyContent);
            
            // Add verification functionality
            const btnVerify = document.getElementById('btnVerify');
            if (btnVerify) {
                btnVerify.addEventListener('click', function() {
                    const code = document.getElementById('verificationCode').value.trim();
                    if (!code) {
                        showNotification('Please enter a verification code', 'warning');
                        return;
                    }
                    
                    const result = verifyPayslip(code);
                    const resultContainer = document.getElementById('verificationResult');
                    
                    if (result.valid) {
                        resultContainer.innerHTML = `
                            <div class="verification-success">
                                <h3>✓ Document Verified</h3>
                                <p>${result.message}</p>
                                <div class="verification-details">
                                    <p><strong>Employee:</strong> ${result.payslip.employeeName}</p>
                                    <p><strong>ID Number:</strong> ${result.payslip.idNumber}</p>
                                    <p><strong>Pay Period:</strong> ${result.payslip.payPeriod}</p>
                                    <p><strong>Amount:</strong> ${formatCurrency(result.payslip.totalPay)}</p>
                                    ${result.expired ? '<p class="verification-warning">Note: This document has expired</p>' : ''}
                                </div>
                                <button type="button" class="btn-view" id="btnViewVerified">View Document</button>
                            </div>
                        `;
                        
                        // Add view button functionality
                        document.getElementById('btnViewVerified').addEventListener('click', function() {
                            viewPayslip(result.payslip.id);
                        });
                        
                        showNotification('Document verification successful', 'success');
                    } else {
                        resultContainer.innerHTML = `
                            <div class="verification-error">
                                <h3>✗ Verification Failed</h3>
                                <p>${result.message}</p>
                                <p>This document could not be verified. Please check the verification code and try again.</p>
                            </div>
                        `;
                        
                        showNotification('Document verification failed', 'error');
                    }
                });
            }
        }
    }
});
