// Update the base path for GitHub Pages
const BASE_PATH = "/effective-barnacle/";

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
        window.location.href = BASE_PATH + "dashboard.html";
    } else {
        alert("Invalid credentials. Please try again.");
    }
    
    return false;
}

// Check login status on page load
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const currentPage = window.location.pathname.split("/").pop();
    
    if (currentPage !== "login.html" && !isLoggedIn && currentPage !== "index.html") {
        // Redirect to login if not logged in
        window.location.href = BASE_PATH + "login.html";
    } else if (currentPage === "login.html" && isLoggedIn) {
        // Redirect to dashboard if already logged in
        window.location.href = BASE_PATH + "dashboard.html";
    }
}

// Add logout functionality
function logout() {
    localStorage.removeItem("isLoggedIn");
    window.location.href = BASE_PATH + "login.html";
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

// Check login status when page loads
document.addEventListener("DOMContentLoaded", function() {
    // Check if we are on a page that needs login protection
    const protectedPages = ["dashboard.html"];
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    
    if (protectedPages.includes(currentPage)) {
        checkLoginStatus();
    }
});
