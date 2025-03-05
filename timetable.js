var currentDay = "";
var timetableData = null; // Store timetable data globally

document.addEventListener("DOMContentLoaded", function () {
    fetch("timetable.json") // Load the JSON file
        .then(response => response.json())
        .then(data => {
            timetableData = data; // Save globally for use by updateTimeIndicator()
            currentDay = new Date().toLocaleString("en-GB", { weekday: "long" });
            if (currentDay === "Saturday" || currentDay === "Sunday") {
                currentDay = "Monday";
            }
            renderTimetable();
            setupDayLinks();
            setupSwipeEvents();
            updateTimeIndicator(); // Call once immediately
            // Then update the time indicator every few seconds (e.g. every 10 seconds)
            setInterval(updateTimeIndicator, 1000);
        })
        .catch(error => console.error("Error loading timetable:", error));
});

function setupDayLinks() {
    const links = document.querySelectorAll("#day-links a");
    links.forEach(link => {
        const day = link.getAttribute("data-day");
        if (day === currentDay) {
            link.classList.add("active");
        }
        link.addEventListener("click", function (event) {
            event.preventDefault();
            links.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            currentDay = day; // Update currentDay when a link is clicked
            renderTimetable(day);
        });
    });
}

function setupSwipeEvents() {
    const timetableContainer = document.getElementById("timetable");
    let startX = 0;
    let startY = 0;

    timetableContainer.addEventListener("touchstart", function (event) {
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
    });

    timetableContainer.addEventListener("touchend", function (event) {  
        const endX = event.changedTouches[0].clientX;
        const endY = event.changedTouches[0].clientY;      
        const threshold = 50; // Minimum distance for a swipe

        let xmovement = startX - endX;
        let ymovement = startY - endY;
        let doSwipe = Math.abs(xmovement) > Math.abs(ymovement) && Math.abs(xmovement) > threshold;

        if (startX - endX > threshold && doSwipe) {
            // Swipe left
            currentDay = getNextDay(currentDay);
        }
        if (endX - startX > threshold && doSwipe) {
            // Swipe right
            currentDay = getPreviousDay(currentDay);
        }

        if (doSwipe) {
            fadeOutAndRenderTimetable(currentDay);
            updateActiveLink(currentDay);
        }
    });
}

function getNextDay(day) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    let index = days.indexOf(day);
    index = (index + 1) % days.length;
    return days[index];
}

function getPreviousDay(day) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    let index = days.indexOf(day);
    index = (index - 1 + days.length) % days.length;
    return days[index];
}

function updateActiveLink() {
    const links = document.querySelectorAll("#day-links a");
    links.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("data-day") === currentDay) {
            link.classList.add("active");
        }
    });
}

function fadeOutAndRenderTimetable(day) {
    const timetableContainer = document.getElementById("timetable");
    timetableContainer.classList.add("fade-out");

    setTimeout(() => {
        renderTimetable();
        timetableContainer.classList.remove("fade-out");
        // Immediately update the time indicator after rendering a new timetable
        updateTimeIndicator();
    }, 200); // Match the duration of the CSS transition
}

function renderTimetable() {
    const timetableContainer = document.getElementById("timetable");
    timetableContainer.innerHTML = "";

    const periods = timetableData.periods;
    const schedule = timetableData.week[currentDay] || {};

    let startOfDay = toMinutes(periods[0].start_time);
    let endOfDay = toMinutes(periods[periods.length - 1].end_time);

    // Get the current time once here for layout purposes
    const now = new Date();

    periods.forEach((period, index) => {
        const periodStart = toMinutes(period.start_time);
        const periodEnd = toMinutes(period.end_time);
        const duration = periodEnd - periodStart;

        const div = document.createElement("div");
        div.classList.add("period");
        // Tag this block with its start/end times (in minutes) for later updates
        div.dataset.start = periodStart;
        div.dataset.end = periodEnd;
        div.style.height = `${(duration / (endOfDay - startOfDay)) * 100}vh`;

        if (period.is_lesson) {
            div.innerHTML = `
                <div class="start-time">${period.start_time}</div>
                <div class="end-time">${period.end_time}</div>`;
        }

        if (schedule[period.name]) {
            const session = schedule[period.name];
            let subjectLabel = session.subject;
            if (session.session_code.includes("LEARN")) {
                subjectLabel += " - Learn";
            } else if (session.session_code.includes("EXP")) {
                subjectLabel += " - Explore";
            }

            div.classList.add("lesson");
            div.innerHTML += `
                <div class="subject">${subjectLabel}</div>
                <div class="teacher">${session.teachers.join(", ")}</div>
                <div class="code">${session.session_code}</div>
            `;
        } else {
            div.classList.add(period.is_lesson ? "free-period" : "break");
            if (!period.is_lesson) {
                div.innerHTML += `<div class="period-name">${period.name}</div>`;
            } else {
                div.innerHTML += `<div class="free-period-text">(free period)</div>`;
            }
        }

        // Check if the period name starts with "P" and place it in the top right corner
        if (period.name.startsWith("P")) {
            div.innerHTML += `<div class="period-name top-right">${period.name}</div>`;
        }

        timetableContainer.appendChild(div);

        // Check for short gap between this period and the next period
        if (index < periods.length - 1) {
            const nextPeriodStart = toMinutes(periods[index + 1].start_time);
            const gapDuration = nextPeriodStart - periodEnd;

            if (gapDuration > 0 && gapDuration <= 15) { // Assuming short gap is 15 minutes or less
                const gapDiv = document.createElement("div");
                gapDiv.classList.add("short-gap");
                // Tag the gap with its start/end times
                gapDiv.dataset.start = periodEnd;
                gapDiv.dataset.end = nextPeriodStart;
                gapDiv.style.height = `${(gapDuration / (endOfDay - startOfDay)) * 100}vh`;

                // Optionally, you can add a label to the gap if needed
                timetableContainer.appendChild(gapDiv);
            }
        }
    });
}

function toMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * updateTimeIndicator() scans all timetable blocks (periods and gaps)
 * to find the one covering the current time. It then creates or moves the
 * time indicator element within that block.
 */
function updateTimeIndicator() {
    const timetableContainer = document.getElementById("timetable");
    // Remove any existing time indicators
    const oldIndicators = timetableContainer.querySelectorAll(".time-indicator");
    oldIndicators.forEach(el => el.remove());

    const now = new Date();
    const today = now.toLocaleString("en-GB", { weekday: "long" });

    if(currentDay !== today) {
        return;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Iterate over all children (both periods and gaps) to find the block for the current time.
    const blocks = timetableContainer.children;
    for (let block of blocks) {
        const blockStart = parseInt(block.dataset.start);
        const blockEnd = parseInt(block.dataset.end);
        if (currentMinutes >= blockStart && currentMinutes < blockEnd) {
            const duration = blockEnd - blockStart;
            const offsetPercent = ((currentMinutes - blockStart) / duration) * 100;

            // Create and append the time indicator element
            let timeIndicator = document.createElement("div");
            timeIndicator.classList.add("time-indicator");
            timeIndicator.style.top = `${offsetPercent}%`;
            block.appendChild(timeIndicator);

            break; // Only one block should match the current time
        }
    }
}
