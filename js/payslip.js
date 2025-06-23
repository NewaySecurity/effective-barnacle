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
    return getFromLocalStorage(STORAGE_KEYS.PAYSLIPS) || [];
}

// Save a payslip to history
function savePayslipToHistory(payslipData) {
    const payslips = getPayslipHistory();
    
    // Add unique ID and timestamp to payslip
    const newPayslip = {
        ...payslipData,
        id: generateUniqueId(),
        timestamp: new Date().toISOString(),
    };
    
    // Add to beginning of array (newest first)
    payslips.unshift(newPayslip);
    
    // Save back to storage
    return saveToLocalStorage(STORAGE_KEYS.PAYSLIPS, payslips);
}

// Generate a unique ID for payslips
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase();
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
// Generate PDF for payslip
function generatePDF(payslipData = null) {
    const data = payslipData || currentPayslipData;
    if (!data) {
        showNotification('No payslip data available', 'error');
        return null;
    }
    
    // Create a promise to load the logo
    const loadLogo = new Promise((resolve, reject) => {
        const logoImg = new Image();
        logoImg.onload = function() {
            resolve(logoImg);
        };
        logoImg.onerror = function() {
            console.warn('Could not load logo, using text fallback');
            resolve(null);
        };
        logoImg.src = 'assets/Neway Logo.png'; // Path relative to base URL
    });
    
    // Return a promise so we can use async/await for image loading
    return loadLogo.then(logoImg => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Set document properties
            doc.setProperties({
                title: `Payslip - ${data.employeeName} - ${data.payPeriod}`,
                subject: 'Employee Payslip',
                author: 'Neway Security Services',
                keywords: 'payslip, salary, employee',
                creator: 'Neway Security Payroll System'
            });
            
            // Format the pay period
            const payPeriodDate = new Date(data.payPeriod + '-01');
            const formattedPayPeriod = payPeriodDate.toLocaleDateString('en-ZA', {
                month: 'long',
                year: 'numeric'
            });
            
            // Document constants
            const pageWidth = doc.internal.pageSize.width;
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

// View a payslip from history
function viewPayslip(payslipId) {
    const payslips = getPayslipHistory();
    const payslip = payslips.find(p => p.id === payslipId);
    
    if (!payslip) {
        showNotification('Payslip not found', 'error');
        return;
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
});
