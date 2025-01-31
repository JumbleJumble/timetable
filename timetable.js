document.addEventListener("DOMContentLoaded", function () {
    fetch("timetable.json") // Load the JSON file
        .then(response => response.json())
        .then(data => renderTimetable(data))
        .catch(error => console.error("Error loading timetable:", error));
});

function renderTimetable(data) {
    const timetableContainer = document.getElementById("timetable");
    timetableContainer.innerHTML = "";

    const today = new Date().toLocaleString("en-GB", { weekday: "long" });
    const periods = data.periods;
    const schedule = data.week[today] || {};

    let startOfDay = toMinutes(periods[0].start_time);
    let endOfDay = toMinutes(periods[periods.length - 1].end_time);

    periods.forEach((period, index) => {
        const periodStart = toMinutes(period.start_time);
        const periodEnd = toMinutes(period.end_time);
        const duration = periodEnd - periodStart;

        const div = document.createElement("div");
        div.classList.add("period");
        div.style.height = `${(duration / (endOfDay - startOfDay)) * 100}vh`;

        if (schedule[period.name]) {
            const session = schedule[period.name];
            let subjectLabel = session.subject;
            if (session.session_code.includes("LEARN")) {
                subjectLabel += " - Learn";
            } else if (session.session_code.includes("EXP")) {
                subjectLabel += " - Explore";
            }

            div.classList.add("lesson");
            div.innerHTML = `
                <div class="subject">${subjectLabel}</div>
                <div class="teacher">${session.teachers.join(", ")}</div>
                <div class="code">${session.session_code}</div>
            `;
        } else {
            div.classList.add(period.is_lesson ? "free-period" : "break");
            if (!period.is_lesson) {
                div.innerHTML = `<div class="period-name">${period.name}</div>`;
            }
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
                timetableContainer.appendChild(gapDiv);
            }
        }
    });

    drawTimeIndicator(startOfDay, endOfDay);
}

function toMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function drawTimeIndicator(startOfDay, endOfDay) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const timeIndicator = document.createElement("div");
    timeIndicator.id = "time-indicator";
    timeIndicator.style.top = `${((currentMinutes - startOfDay) / (endOfDay - startOfDay)) * 100}vh`;
    document.getElementById("timetable").appendChild(timeIndicator);
}
