document.getElementById("adminLoginForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    // Send admin login credentials to backend
    try {
        const response = await fetch("http://localhost:3000/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();
        if (response.ok) {
            alert("Login successful");
            document.getElementById("adminLoginForm").style.display = "none";
            document.getElementById("adminDashboard").style.display = "block";
        } else {
            alert(result.message || "Failed to login.");
        }
    } catch (error) {
        console.error("Error logging in:", error);
        alert("Error connecting to the server.");
    }
});

document.getElementById("loadUsers").addEventListener("click", async function () {
    try {
        const response = await fetch("http://localhost:3000/admin/users", { method: "GET" });
        const users = await response.json();

        const userTableBody = document.getElementById("userTable").querySelector("tbody");
        userTableBody.innerHTML = ""; // Clear previous entries

        users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.user_id}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td>${user.monthly_budget}</td>
                <td>${user.target_daily}</td>
            `;
            userTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading users:", error);
        alert("Failed to load user data.");
    }
});
