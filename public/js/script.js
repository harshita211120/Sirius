let studyInterval = null;
let pomodoroInterval = null;

let studySeconds = 0;
let pomodoroSeconds = 25 * 60;

let studyRunning = false;
let pomodoroRunning = false;


/* ================= STUDY TIMER ================= */

function startStudyTimer() {

    // Agar Pomodoro chal raha hai to usko reset karo
    if (pomodoroRunning) {
        resetPomodoro();
    }

    // Agar first time start ho raha hai
    if (studySeconds === 0) {
        let minutes = parseInt(document.getElementById("customMinutes").value);

        if (!minutes || minutes <= 0) {
            alert("Enter valid minutes");
            return;
        }

        studySeconds = minutes * 60;
        updateStudyDisplay();
    }

    if (!studyRunning) {
        studyRunning = true;

        studyInterval = setInterval(() => {
            if (studySeconds <= 0) {
                resetStudy();
                return;
            }

            studySeconds--;
            updateStudyDisplay();
        }, 1000);
    }
}

function toggleStudyPause() {

    const btn = document.getElementById("studyPauseBtn");

    if (studyRunning) {
        clearInterval(studyInterval);
        studyRunning = false;
        btn.innerText = "Continue";
    } else {

        if (studySeconds <= 0) return;

        studyRunning = true;
        btn.innerText = "Pause";

        studyInterval = setInterval(() => {
            if (studySeconds <= 0) {
                resetStudy();
                return;
            }

            studySeconds--;
            updateStudyDisplay();
        }, 1000);
    }
}

function resetStudy() {
    clearInterval(studyInterval);
    studyRunning = false;
    studySeconds = 0;

    document.getElementById("studyTime").innerText = "00:00";
    document.getElementById("studyPauseBtn").innerText = "Pause";
}

function updateStudyDisplay() {
    let mins = Math.floor(studySeconds / 60);
    let secs = studySeconds % 60;

    document.getElementById("studyTime").innerText =
        String(mins).padStart(2, '0') + ":" +
        String(secs).padStart(2, '0');
}



/* ================= POMODORO TIMER ================= */

function startPomodoro() {

    if (studyRunning) {
        resetStudy();
    }

    if (!pomodoroRunning) {
        pomodoroRunning = true;

        pomodoroInterval = setInterval(() => {
            if (pomodoroSeconds <= 0) {
                resetPomodoro();
                return;
            }

            pomodoroSeconds--;
            updatePomodoroDisplay();
        }, 1000);
    }
}

function togglePomodoroPause() {

    const btn = document.getElementById("pomodoroPauseBtn");

    if (pomodoroRunning) {
        clearInterval(pomodoroInterval);
        pomodoroRunning = false;
        btn.innerText = "Continue";
    } else {

        if (pomodoroSeconds <= 0) return;

        pomodoroRunning = true;
        btn.innerText = "Pause";

        pomodoroInterval = setInterval(() => {
            if (pomodoroSeconds <= 0) {
                resetPomodoro();
                return;
            }

            pomodoroSeconds--;
            updatePomodoroDisplay();
        }, 1000);
    }
}

function resetPomodoro() {
    clearInterval(pomodoroInterval);
    pomodoroRunning = false;
    pomodoroSeconds = 25 * 60;

    updatePomodoroDisplay();
    document.getElementById("pomodoroPauseBtn").innerText = "Pause";
}

function updatePomodoroDisplay() {
    let mins = Math.floor(pomodoroSeconds / 60);
    let secs = pomodoroSeconds % 60;

    document.getElementById("pomodoroTime").innerText =
        String(mins).padStart(2, '0') + ":" +
        String(secs).padStart(2, '0');
}

