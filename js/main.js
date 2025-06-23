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
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("loginTime", new Date().getTime());
        window.location.href = getPath("dashboard");
    } else {
        alert("Invalid credentials. Please try again.");
    }
    
    return false;
}

// Check login status
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const currentPage = getCurrentPage();
    const loginTime = parseInt(localStorage.getItem("loginTime") || "0");
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
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loginTime");
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
    alert("Thank you for your message. We will get back to you soon!");
    
    // Clear the form
    event.target.reset();
    
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
    
    // Update active navigation link
    const currentPage = getCurrentPage();
    const activeLink = document.querySelector(`.nav-links a[href="${currentPage}"]`);
    if (activeLink) {
        activeLink.classList.add("active");
    }
});
