document.addEventListener("DOMContentLoaded", function () {
    fetch("timetable.json") // Load the JSON file
        .then(response => response.json())
        .then(data => {
            renderTimetable(data, new Date().toLocaleString("en-GB", { weekday: "long" }));
            setupDayLinks(data);
        })
        .catch(error => console.error("Error loading timetable:", error));
});

function setupDayLinks(data) {
    const links = document.querySelectorAll("#day-links a");
    let currentDay = new Date().toLocaleString("en-GB", { weekday: "long" });
    if (currentDay === "Saturday" || currentDay === "Sunday") {
        currentDay = "Monday";
    }
    links.forEach(link => {
        const day = link.getAttribute("data-day");
        if (day === currentDay) {
            link.classList.add("active");
        }
        link.addEventListener("click", function (event) {
            event.preventDefault();
            links.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            renderTimetable(data, day);
        });
    });
}

function renderTimetable(data, day) {
    const timetableContainer = document.getElementById("timetable");
    timetableContainer.innerHTML = "";

    const periods = data.periods;
    const schedule = data.week[day] || {};

    let startOfDay = toMinutes(periods[0].start_time);
    let endOfDay = toMinutes(periods[periods.length - 1].end_time);

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentDay = new Date().toLocaleString("en-GB", { weekday: "long" });

    let timeIndicator = null;

    periods.forEach((period, index) => {
        const periodStart = toMinutes(period.start_time);
        const periodEnd = toMinutes(period.end_time);
        const duration = periodEnd - periodStart;

        const div = document.createElement("div");
        div.classList.add("period");
        div.style.height = `${(duration / (endOfDay - startOfDay)) * 100}vh`;

        // Remove top border from the first period
        if (index === 0) {
            div.style.borderTop = "none";
        }

        // Remove bottom border from the last period
        if (index === periods.length - 1) {
            div.style.borderBottom = "none";
        }

        div.innerHTML = `
            <div class="start-time">${period.start_time}</div>
            <div class="end-time">${period.end_time}</div>
        `;

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

        // Check if the current time falls within this period
        if (currentDay === day && currentMinutes >= periodStart && currentMinutes <= periodEnd) {
            timeIndicator = document.createElement("div");
            timeIndicator.classList.add("time-indicator");
            timeIndicator.style.top = `${((currentMinutes - periodStart) / duration) * 100}%`;
            div.appendChild(timeIndicator);
        }

        timetableContainer.appendChild(div);

        // Check for short gap between this period and the next period
        if (index < periods.length - 1) {
            const nextPeriodStart = toMinutes(periods[index + 1].start_time);
            const gapDuration = nextPeriodStart - periodEnd;

            if (gapDuration > 0 && gapDuration <= 15) { // Assuming short gap is 15 minutes or less
                const gapDiv = document.createElement("div");
                gapDiv.classList.add("short-gap");
                gapDiv.style.height = `${(gapDuration / (endOfDay - startOfDay)) * 100}vh`;

                // Check if the current time falls within this gap
                if (currentDay === day && currentMinutes >= periodEnd && currentMinutes <= nextPeriodStart) {
                    timeIndicator = document.createElement("div");
                    timeIndicator.classList.add("time-indicator");
                    timeIndicator.style.top = `${((currentMinutes - periodEnd) / gapDuration) * 100}%`;
                    gapDiv.appendChild(timeIndicator);
                }

                timetableContainer.appendChild(gapDiv);
            }
        }
    });

    // Scroll to the parent div containing the time indicator
    if (timeIndicator) {
        timeIndicator.parentElement.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
}

function toMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}