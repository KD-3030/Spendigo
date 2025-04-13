document.addEventListener("DOMContentLoaded", function() {
    let userId; // Declare a variable to store the user ID
    let targetDailyBudget;

    // Registration form submission
    document.getElementById("registrationForm").addEventListener("submit", async function(event) {
        event.preventDefault();
        
        const email = document.getElementById("email").value;
        const phone = document.getElementById("phone").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("http://localhost:3000/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, phone, password })
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                
                // Hide registration section and show the registration complete message
                document.getElementById("registration").style.display = "none";
                document.getElementById("registrationComplete").style.display = "block"; // Show the registration complete message
            } else {
                throw new Error(result.message || "Registration failed");
            }
        } catch (error) {
            console.error("Error registering user:", error);
            alert("Failed to register user.");
        }
    });

    // Sign In Again button
    document.getElementById("signInAgainButton").addEventListener("click", function() {
        document.getElementById("registrationComplete").style.display = "none";
        document.getElementById("sign-in").style.display = "block";
    });

    // Sign-in form submission
    document.getElementById("signInForm").addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = document.getElementById("signInEmail").value;
        const password = document.getElementById("signInPassword").value;

        try {
            const response = await fetch("http://localhost:3000/sign-in", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();
            if (response.ok) {
                userId = result.userId; // Store user ID from sign-in response

                // Hide the sign-in section and show the account page
                document.getElementById("sign-in").style.display = "none";
                document.getElementById("accountPage").style.display = "block";

                // Display the user email on the account page
                document.getElementById("accountEmail").innerText = email;

                // Check if the budget is already set for this user
                checkIfBudgetExists(userId);
            } else {
                throw new Error(result.message || "Sign-in failed");
            }
        } catch (error) {
            console.error("Error signing in user:", error);
            alert("Failed to sign in.");
        }
    });

    function togglePasswordVisibility(inputId, eyeButton) {
        const input = document.getElementById(inputId);
    
        if (input.type === "password") {
            input.type = "text";
            eyeButton.textContent = "🙈"; // Change icon to hide
        } else {
            input.type = "password";
            eyeButton.textContent = "👁️"; // Change icon to reveal
        }
    }


    // Function to check if a budget already exists for the user
    async function checkIfBudgetExists(userId) {
        try {
            const response = await fetch(`http://localhost:3000/check-budget/${userId}`);
            const budgetData = await response.json();
    
            if (response.ok) {
                if (budgetData.hasBudget) {
                    targetDailyBudget = budgetData.targetDaily; // Store the target daily budget
    
                    // Show expense input section and display budget details
                    document.getElementById("budget-input").style.display = "none";
                    document.getElementById("expense-input").style.display = "block";
                    
                    // Display Monthly Budget and Remaining Budget
                    document.getElementById("dailySavings").innerText = `Monthly Budget: $${budgetData.monthlyBudget}`;
    
                    // Fetch and display remaining budget data
                    getSavings(userId);
                } else {
                    // If no budget exists, show the budget input section
                    document.getElementById("budget-input").style.display = "block";
                }
            } else {
                throw new Error(budgetData.message || "Failed to check budget data");
            }
        } catch (error) {
            console.error("Error checking budget data:", error);
            alert("Failed to check budget data.");
        }
    }

    // Budget submission
    document.getElementById("submitBudget").addEventListener("click", async function() {
        const monthlyBudget = parseFloat(document.getElementById("monthlyBudget").value);
        const targetDaily = parseFloat(document.getElementById("targetDaily").value);

        if (isNaN(monthlyBudget) || isNaN(targetDaily) || monthlyBudget <= 0 || targetDaily <= 0) {
            alert("Please enter valid budget values.");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/set-budget", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId, monthlyBudget, targetDaily })
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message);

                // Hide budget input section and show expense input section
                document.getElementById("budget-input").style.display = "none";
                document.getElementById("expense-input").style.display = "block";

                // Fetch updated remaining budget after setting the budget
                getSavings(userId);
            } else {
                throw new Error(result.message || "Failed to set budget");
            }
        } catch (error) {
            console.error("Error setting budget:", error);
            alert("Failed to set budget.");
        }
    });

    // Expense submission
    document.getElementById("addExpense").addEventListener("click", async function() {
        const dailyExpense = parseFloat(document.getElementById("dailyExpense").value);
        const warningMessage = document.getElementById("expenseWarning");
    
        // Hide the warning message initially
        warningMessage.style.display = "none";
    
        if (isNaN(dailyExpense) || dailyExpense < 0) {
            alert("Please enter a valid expense amount.");
            return;
        }
    
        // Check if the daily expense exceeds the target daily budget
        if (dailyExpense > targetDailyBudget) {
            // Show the warning message but continue to add the expense
            warningMessage.style.display = "block";
        }
    
        try {
            const response = await fetch("http://localhost:3000/add-expense", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId, dailyExpense })
            });
    
            const result = await response.json();
            if (response.ok) {
                alert(result.message);
    
                // Fetch updated remaining budget after adding an expense
                getSavings(userId);
            } else {
                throw new Error(result.message || "Failed to add expense");
            }
        } catch (error) {
            console.error("Error adding expense:", error);
            alert("Failed to add expense.");
        }
    });
    
    
    

    // Navigation between sections
    document.getElementById("registerButton").addEventListener("click", function() {
        document.getElementById("landing").style.display = "none";
        document.getElementById("registration").style.display = "block";
    });

    document.getElementById("signInButton").addEventListener("click", function() {
        document.getElementById("landing").style.display = "none";
        document.getElementById("sign-in").style.display = "block";
    });

    // Function to fetch and display remaining budget data
    async function getSavings(userId) {
        try {
            const response = await fetch(`http://localhost:3000/get-savings/${userId}`);
            const savingsData = await response.json();

            if (response.ok) {
                document.getElementById("dailySavings").innerText = `Monthly Budget: $${savingsData.monthlyBudget}`;
                document.getElementById("monthlySavings").innerText = `Remaining Monthly Budget: $${savingsData.remainingBudget}`;
            } else {
                throw new Error(savingsData.message || "Failed to fetch remaining budget");
            }
        } catch (error) {
            console.error("Error fetching remaining budget data:", error);
            alert("Failed to fetch remaining budget data.");
        }
    }
});
