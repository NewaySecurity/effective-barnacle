// Payslip generation and handling functionality
let currentPayslipData = null;

function calculateTotalPay(hours, rate, deductions) {
    const grossPay = hours * rate;
    return grossPay - deductions;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR'
    }).format(amount);
}

function generatePayslip(event) {
    event.preventDefault();
    
    const formData = {
        employeeName: document.getElementById('employeeName').value,
        idNumber: document.getElementById('idNumber').value,
        position: document.getElementById('position').value,
        hoursWorked: parseFloat(document.getElementById('hoursWorked').value),
        hourlyRate: parseFloat(document.getElementById('hourlyRate').value),
        deductions: parseFloat(document.getElementById('deductions').value)
    };
    
    const totalPay = calculateTotalPay(formData.hoursWorked, formData.hourlyRate, formData.deductions);
    formData.totalPay = totalPay;
    
    // Store current payslip data
    currentPayslipData = formData;
    
    // Generate preview
    const preview = document.getElementById('payslipPreview');
    preview.innerHTML = generatePayslipHTML(formData);
    preview.classList.add('visible');
    
    // Enable share button
    document.getElementById('sharePayslip').disabled = false;
    
    return false;
}

function generatePayslipHTML(data) {
    const grossPay = data.hoursWorked * data.hourlyRate;
    
    return `
        <h2>NEWAY SECURITY SERVICES - Payslip</h2>
        <div class="payslip-content">
            <div class="payslip-header">
                <p><strong>Employee Name:</strong> ${data.employeeName}</p>
                <p><strong>ID Number:</strong> ${data.idNumber}</p>
                <p><strong>Position:</strong> ${data.position}</p>
            </div>
            
            <div class="payslip-details">
                <p><strong>Hours Worked:</strong> ${data.hoursWorked}</p>
                <p><strong>Hourly Rate:</strong> ${formatCurrency(data.hourlyRate)}</p>
                <p><strong>Gross Pay:</strong> ${formatCurrency(grossPay)}</p>
                <p><strong>Deductions:</strong> ${formatCurrency(data.deductions)}</p>
                <p><strong>Total Pay:</strong> ${formatCurrency(data.totalPay)}</p>
            </div>
            
            <div class="payslip-footer">
                <p>PSIRA Registration No: 3145212</p>
                <p>STAND NO. 10111, MATSIKITSANE, R40 MAIN ROAD, ACORNHOEK 1360</p>
                <p>Contact: 079 955 0700 / 072 555 6444</p>
            </div>
        </div>
    `;
}

function generatePDF() {
    if (!currentPayslipData) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add company header
    doc.setFontSize(16);
    doc.text('NEWAY SECURITY SERVICES', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('PAYSLIP', 105, 30, { align: 'center' });
    
    // Add employee details
    doc.setFontSize(10);
    doc.text(`Employee Name: ${currentPayslipData.employeeName}`, 20, 50);
    doc.text(`ID Number: ${currentPayslipData.idNumber}`, 20, 60);
    doc.text(`Position: ${currentPayslipData.position}`, 20, 70);
    
    // Add payment details
    doc.text(`Hours Worked: ${currentPayslipData.hoursWorked}`, 20, 90);
    doc.text(`Hourly Rate: ${formatCurrency(currentPayslipData.hourlyRate)}`, 20, 100);
    doc.text(`Deductions: ${formatCurrency(currentPayslipData.deductions)}`, 20, 110);
    doc.text(`Total Pay: ${formatCurrency(currentPayslipData.totalPay)}`, 20, 120);
    
    // Add company footer
    doc.setFontSize(8);
    doc.text('PSIRA Registration No: 3145212', 105, 160, { align: 'center' });
    doc.text('STAND NO. 10111, MATSIKITSANE, R40 MAIN ROAD, ACORNHOEK 1360', 105, 170, { align: 'center' });
    doc.text('Contact: 079 955 0700 / 072 555 6444', 105, 180, { align: 'center' });
    
    return doc;
}

// Handle share button click
document.getElementById('sharePayslip').addEventListener('click', function() {
    if (!currentPayslipData) return;
    
    const doc = generatePDF();
    const pdfName = `payslip_${currentPayslipData.employeeName.replace(/\s+/g, '_')}.pdf`;
    
    // Save the PDF
    doc.save(pdfName);
});
