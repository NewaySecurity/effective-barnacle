// Base configuration for GitHub Pages
const config = {
    basePath: "/effective-barnacle/",
    pages: {
        home: "index.html",
        login: "login.html",
        dashboard: "dashboard.html",
        about: "about.html",
        contact: "contact.html"
    }
};

// Data models
const STORAGE_KEYS = {
    EMPLOYEES: 'neway_employees',
    PAYSLIPS: 'neway_payslips',
    LOGIN: 'isLoggedIn',
    LOGIN_TIME: 'loginTime'
};

// Helper function to get full path
function getPath(page) {
    return config.basePath + config.pages[page];
}

// Helper function to get current page name
function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html";
    return page;
}

// Local storage helper functions
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showNotification('Error saving data. Please try again.', 'error');
        return false;
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error retrieving from localStorage:', error);
        return null;
    }
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    notification.className = 'notification show';
    
    if (type === 'error') {
        notification.style.background = '#f44336';
    } else if (type === 'warning') {
        notification.style.background = '#FF9800';
    } else {
        notification.style.background = '#4CAF50';
    }
    
    setTimeout(() => {
        notification.className = 'notification';
    }, 3000);
}

// Employee profile management
function getEmployeeProfiles() {
    return getFromLocalStorage(STORAGE_KEYS.EMPLOYEES) || {};
}

function getEmployeeById(idNumber) {
    const employees = getEmployeeProfiles();
    return employees[idNumber] || null;
}

function saveEmployeeProfile(employeeData) {
    const employees = getEmployeeProfiles();
    const isNewEmployee = !employees[employeeData.idNumber];
    
    employees[employeeData.idNumber] = {
        ...employeeData,
        lastUpdated: new Date().toISOString()
    };
    
    const success = saveToLocalStorage(STORAGE_KEYS.EMPLOYEES, employees);
    
    if (success) {
        showNotification(
            isNewEmployee 
                ? `Employee profile created for ${employeeData.name}` 
                : `Employee profile updated for ${employeeData.name}`
        );
        renderEmployeeProfiles();
        return true;
    }
    
    return false;
}

function deleteEmployeeProfile(idNumber) {
    const employees = getEmployeeProfiles();
    
    if (employees[idNumber]) {
        const employeeName = employees[idNumber].name;
        delete employees[idNumber];
        
        if (saveToLocalStorage(STORAGE_KEYS.EMPLOYEES, employees)) {
            showNotification(`Employee profile for ${employeeName} has been deleted`);
            renderEmployeeProfiles();
            return true;
        }
    }
    
    return false;
}

function renderEmployeeProfiles(searchTerm = '') {
    const employees = getEmployeeProfiles();
    const employeeList = document.getElementById('employeeList');
    const noEmployees = document.getElementById('noEmployees');
    
    if (!employeeList) return; // Not on the dashboard page
    
    // Filter employees if search term exists
    const filteredEmployees = Object.values(employees).filter(employee => {
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase();
        return (
            employee.name.toLowerCase().includes(searchLower) ||
            employee.idNumber.includes(searchTerm) ||
            employee.position.toLowerCase().includes(searchLower)
        );
    });
    
    if (filteredEmployees.length === 0) {
        employeeList.innerHTML = '';
        noEmployees.style.display = 'block';
        return;
    }
    
    noEmployees.style.display = 'none';
    
    // Sort by name
    filteredEmployees.sort((a, b) => a.name.localeCompare(b.name));
    
    employeeList.innerHTML = filteredEmployees.map(employee => `
        <div class="profile-card">
            <div class="profile-actions">
                <button class="btn-edit" onclick="openProfileModal('${employee.idNumber}')">✏️</button>
                <button class="btn-delete" onclick="confirmDeleteProfile('${employee.idNumber}')">🗑️</button>
            </div>
            
            <h3>${employee.name}</h3>
            <p><strong>ID:</strong> ${employee.idNumber}</p>
            <p><strong>Position:</strong> ${employee.position}</p>
            <p><strong>Contact:</strong> ${employee.email} | ${employee.phone}</p>
            ${employee.address ? `<p><strong>Address:</strong> ${employee.address}</p>` : ''}
            <p><strong>Default Rate:</strong> ${formatCurrency(employee.hourlyRate)}/hour</p>
            
            <div class="profile-footer">
                <button class="btn-view" onclick="autofillFromProfile('${employee.idNumber}')">Create Payslip</button>
                <span class="status-indicator ${employee.isNew ? 'status-new' : 'status-updated'}">
                    ${employee.isNew ? 'New' : 'Updated'}
                </span>
            </div>
        </div>
    `).join('');
}

function openProfileModal(idNumber = null) {
    const profileModal = document.getElementById('profileModal');
    const profileForm = document.getElementById('profileForm');
    
    // Reset form
    profileForm.reset();
    
    if (idNumber) {
        // Edit existing profile
        const employee = getEmployeeById(idNumber);
        if (!employee) {
            showNotification('Employee not found', 'error');
            return;
        }
        
        document.getElementById('profileId').value = idNumber;
        document.getElementById('profileName').value = employee.name;
        document.getElementById('profileIdNumber').value = employee.idNumber;
        document.getElementById('profilePosition').value = employee.position;
        document.getElementById('profileEmail').value = employee.email;
        document.getElementById('profilePhone').value = employee.phone;
        document.getElementById('profileAddress').value = employee.address || '';
        document.getElementById('profileRate').value = employee.hourlyRate;
        
        document.querySelector('.modal-title').textContent = 'Edit Employee Profile';
    } else {
        // New profile
        document.getElementById('profileId').value = '';
        document.querySelector('.modal-title').textContent = 'Add New Employee';
    }
    
    profileModal.classList.add('active');
}

function closeProfileModal() {
    const profileModal = document.getElementById('profileModal');
    profileModal.classList.remove('active');
}

function confirmDeleteProfile(idNumber) {
    const employee = getEmployeeById(idNumber);
    if (!employee) {
        showNotification('Employee not found', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${employee.name}'s profile? This cannot be undone.`)) {
        deleteEmployeeProfile(idNumber);
    }
}

function autofillFromProfile(idNumber) {
    const employee = getEmployeeById(idNumber);
    if (!employee) {
        showNotification('Employee not found', 'error');
        return;
    }
    
    // Switch to payslip tab
    switchTab('payslip-generation');
    
    // Fill form
    document.getElementById('employeeName').value = employee.name;
    document.getElementById('idNumber').value = employee.idNumber;
    document.getElementById('position').value = employee.position;
    document.getElementById('email').value = employee.email;
    document.getElementById('phone').value = employee.phone;
    document.getElementById('address').value = employee.address || '';
    document.getElementById('hourlyRate').value = employee.hourlyRate;
    
    // Focus on the next unfilled field
    document.getElementById('hoursWorked').focus();
    
    showNotification('Employee data loaded', 'success');
}

// Tab system
function switchTab(tabId) {
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        if (button.dataset.tab === tabId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Update tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}
// Login validation
function validateLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    // Hardcoded credentials
    const validUsername = "admin";
    const validPassword = "10111@admin";
    
    if (username === validUsername && password === validPassword) {
        // Successful login
        localStorage.setItem(STORAGE_KEYS.LOGIN, "true");
        localStorage.setItem(STORAGE_KEYS.LOGIN_TIME, new Date().getTime());
        window.location.href = getPath("dashboard");
    } else {
        showNotification("Invalid credentials. Please try again.", "error");
    }
    
    return false;
}

// Check login status
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem(STORAGE_KEYS.LOGIN) === "true";
    const currentPage = getCurrentPage();
    const loginTime = parseInt(localStorage.getItem(STORAGE_KEYS.LOGIN_TIME) || "0");
    const currentTime = new Date().getTime();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

    // Check if session has expired
    if (isLoggedIn && (currentTime - loginTime > sessionTimeout)) {
        logout();
        return;
    }

    // Handle page access based on auth status
    if (currentPage === config.pages.login) {
        if (isLoggedIn) {
            window.location.href = getPath("dashboard");
        }
    } else if (currentPage === config.pages.dashboard) {
        if (!isLoggedIn) {
            window.location.href = getPath("login");
        }
    }
}

// Logout functionality
function logout() {
    localStorage.removeItem(STORAGE_KEYS.LOGIN);
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIME);
    window.location.href = getPath("login");
}

// Handle contact form submission
function handleContactSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const formData = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        subject: document.getElementById("subject").value,
        message: document.getElementById("message").value
    };
    
    // Show success message
    showNotification("Thank you for your message. We will get back to you soon!");
    
    // Clear the form
    event.target.reset();
    
    return false;
}

// Handle profile form submission
function handleProfileSubmit(event) {
    event.preventDefault();
    
    const idNumberInput = document.getElementById('profileIdNumber');
    const nameInput = document.getElementById('profileName');
    
    // Basic validation
    if (!idNumberInput.checkValidity()) {
        showNotification('Please enter a valid 13-digit ID number', 'error');
        idNumberInput.focus();
        return false;
    }
    
    if (!nameInput.checkValidity()) {
        showNotification('Please enter a valid name', 'error');
        nameInput.focus();
        return false;
    }
    
    // Get form data
    const profileData = {
        idNumber: idNumberInput.value,
        name: nameInput.value,
        position: document.getElementById('profilePosition').value,
        email: document.getElementById('profileEmail').value,
        phone: document.getElementById('profilePhone').value,
        address: document.getElementById('profileAddress').value,
        hourlyRate: parseFloat(document.getElementById('profileRate').value),
        isNew: false
    };
    
    // Save profile
    if (saveEmployeeProfile(profileData)) {
        closeProfileModal();
    }
    
    return false;
}
// Initialize page
document.addEventListener("DOMContentLoaded", function() {
    // Check auth status
    checkLoginStatus();
    
    // Add form event listeners
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", validateLogin);
    }
    
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
        contactForm.addEventListener("submit", handleContactSubmit);
    }
    
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
        profileForm.addEventListener("submit", handleProfileSubmit);
    }
    
    // Update active navigation link
    const currentPage = getCurrentPage();
    const activeLink = document.querySelector(`.nav-links a[href="${currentPage}"]`);
    if (activeLink) {
        activeLink.classList.add("active");
    }
    
    // Initialize dashboard tab functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                switchTab(button.dataset.tab);
            });
        });
        
        // Initialize employee profile listing
        renderEmployeeProfiles();
        
        // Initialize payslip history
        renderPayslipHistory();
        
        // Add search functionality
        const searchEmployees = document.getElementById('searchEmployees');
        if (searchEmployees) {
            searchEmployees.addEventListener('input', (e) => {
                renderEmployeeProfiles(e.target.value);
            });
        }
        
        const searchPayslip = document.getElementById('searchPayslip');
        if (searchPayslip) {
            searchPayslip.addEventListener('input', (e) => {
                renderPayslipHistory(e.target.value);
            });
        }
        
        // Add "Add New Employee" button handler
        const addNewEmployee = document.getElementById('addNewEmployee');
        if (addNewEmployee) {
            addNewEmployee.addEventListener('click', () => {
                openProfileModal();
            });
        }
        
        // Add "Create/Update Profile" button handler
        const autofillProfile = document.getElementById('autofillProfile');
        if (autofillProfile) {
            autofillProfile.addEventListener('click', createProfileFromPayslip);
        }
    }
});
