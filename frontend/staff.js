
const BACKEND_URL = "https://ai-college-complaint-system.onrender.com";
const socket = io(BACKEND_URL);

const staffComplaintList = document.getElementById("staffComplaintList");
const totalAssigned = document.getElementById("totalAssigned");
const myPending = document.getElementById("myPending");
const myProgress = document.getElementById("myProgress");
const myResolved = document.getElementById("myResolved");
const staffFilter = document.getElementById("staffFilter");

let complaints = [];

/*
  Demo mode:
  The staff query parameter selects whose work queue to display.
  This is a demo filter, not authentication.
*/
const params = new URLSearchParams(window.location.search);
const staffName = params.get("staff") || "Lab Technician";

const welcome = document.querySelector(".welcome");

if (welcome) {
    const staffLabel = document.createElement("p");
    staffLabel.style.color = "#00a8e1";
    staffLabel.style.marginTop = "10px";
    staffLabel.textContent = "Viewing work queue: " + staffName;
    welcome.appendChild(staffLabel);
}

socket.on("connect", () => {
    console.log("Staff dashboard connected to server.");
});

socket.on("connect_error", error => {
    console.error("Staff connection error:", error.message);
});

socket.on("complaints", data => {
    complaints = Array.isArray(data) ? data : [];
    updateDashboard();
});

socket.on("complaintAdded", data => {
    if (!data) return;

    const id = String(data._id || data.id);
    complaints = complaints.filter(
        item => String(item._id || item.id) !== id
    );

    complaints.unshift(data);
    updateDashboard();
});

socket.on("complaintUpdated", data => {
    if (!data) return;

    const id = String(data._id || data.id);
    const index = complaints.findIndex(
        item => String(item._id || item.id) === id
    );

    if (index === -1) {
        complaints.push(data);
    } else {
        complaints[index] = data;
    }

    updateDashboard();
});

socket.on("operationError", message => {
    alert(message || "The operation could not be completed.");
});

staffFilter.addEventListener("change", displayComplaints);

function getMyComplaints() {
    return complaints.filter(item => item.assignedTo === staffName);
}

function updateDashboard() {
    const mine = getMyComplaints();

    totalAssigned.textContent = mine.length;

    myPending.textContent = mine.filter(
        item => item.status === "Pending"
    ).length;

    myProgress.textContent = mine.filter(
        item => item.status === "In Progress"
    ).length;

    myResolved.textContent = mine.filter(
        item => item.status === "Resolved"
    ).length;

    displayComplaints();
}

function displayComplaints() {
    const mine = getMyComplaints();
    const selectedStatus = staffFilter.value;

    const filtered = selectedStatus === "All"
        ? mine
        : mine.filter(item => item.status === selectedStatus);

    staffComplaintList.replaceChildren();

    if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "No complaints assigned to " + staffName + ".";
        staffComplaintList.appendChild(empty);
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "staff-complaint-card";

        const title = document.createElement("h3");
        title.textContent = item.complaint || "Complaint";

        const details = document.createElement("div");

        function addDetail(label, value, className = "") {
            const row = document.createElement("p");

            const strong = document.createElement("strong");
            strong.textContent = label + ": ";

            const span = document.createElement("span");
            span.textContent = value || "Not available";

            if (className) span.className = className;

            row.append(strong, span);
            details.appendChild(row);
        }

        addDetail("Student", item.studentName);
        addDetail("Roll Number", item.rollNumber);
        addDetail("Department", item.department);
        addDetail("Category", item.category);

        addDetail(
            "Priority",
            item.priority,
            "priority-" + (item.priority || "medium").toLowerCase()
        );

        const statusClass = {
            "Pending": "status-pending",
            "In Progress": "status-progress",
            "Resolved": "status-resolved"
        }[item.status] || "status-pending";

        addDetail(
            "Status",
            item.status || "Pending",
            "status-badge " + statusClass
        );

        const actions = document.createElement("div");
        actions.className = "staff-actions";

        const startButton = document.createElement("button");
        startButton.className = "start-btn";
        startButton.textContent = "🔄 Start Work";
        startButton.disabled =
            item.status === "In Progress" ||
            item.status === "Resolved";

        startButton.addEventListener("click", () => {
            updateStatus(item, "In Progress");
        });

        const resolveButton = document.createElement("button");
        resolveButton.className = "resolve-btn";
        resolveButton.textContent = "✅ Mark Resolved";
        resolveButton.disabled = item.status === "Resolved";

        resolveButton.addEventListener("click", () => {
            updateStatus(item, "Resolved");
        });

        actions.append(startButton, resolveButton);
        card.append(title, details, actions);
        staffComplaintList.appendChild(card);
    });
}

function updateStatus(item, status) {
    const id = item._id || item.id;

    if (!id) {
        alert("Complaint ID missing. Refresh the page and try again.");
        return;
    }

    socket.emit("updateComplaint", {
        _id: id,
        status
    });
}
