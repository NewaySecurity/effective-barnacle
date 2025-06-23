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
        window.location.href = "dashboard.html";
    } else {
        alert("Invalid credentials. Please try again.");
    }
    
    return false;
}

// Check login status on page load
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const currentPage = window.location.pathname.split("/").pop();
    
    if (currentPage !== "login.html" && !isLoggedIn) {
        // Redirect to login if not logged in
        window.location.href = "login.html";
    } else if (currentPage === "login.html" && isLoggedIn) {
        // Redirect to dashboard if already logged in
        window.location.href = "dashboard.html";
    }
}

// Add logout functionality
function logout() {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "login.html";
}

// Check login status when page loads
document.addEventListener("DOMContentLoaded", checkLoginStatus);
// Add this to the existing main.js file

// Contact form handling
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
    
    // In a real implementation, this would send the data to a server
    // For now, we'll just show a success message
    alert("Thank you for your message. We will get back to you soon!");
    
    // Clear the form
    event.target.reset();
    
    return false;
}

// Add mobile navigation handling
document.addEventListener("DOMContentLoaded", function() {
    // Check if we're on a page that needs login protection
    const protectedPages = ["dashboard.html"];
    const currentPage = window.location.pathname.split("/").pop();
    
    if (protectedPages.includes(currentPage)) {
        checkLoginStatus();
    }
});
