console.log("CLOUDATTEND SCRIPT LOADED");


// ========================================
// UI TOASTS
// Replaces browser alert() dialogs with
// lightweight in-app notifications.
// ========================================

function showToast(message, type = "info") {


        // Convert API/object errors into readable text
    if (typeof message !== "string") {

        if (message?.detail) {
            message = message.detail;
        } else if (message?.message) {
            message = message.message;
        } else {
            try {
                message = JSON.stringify(message);
            } catch {
                message = "Something went wrong.";
            }
        }
    }


    let toastContainer =
        document.getElementById("cloudattend-toast-container");

    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "cloudattend-toast-container";
        toastContainer.style.position = "fixed";
        toastContainer.style.top = "24px";
        toastContainer.style.right = "24px";
        toastContainer.style.zIndex = "99999";
        toastContainer.style.display = "flex";
        toastContainer.style.flexDirection = "column";
        toastContainer.style.gap = "10px";
        toastContainer.style.maxWidth = "360px";
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.padding = "13px 16px";
    toast.style.border = "1px solid #e2e8f0";
    toast.style.borderRadius = "12px";
    toast.style.background = "#ffffff";
    toast.style.color = "#0f172a";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "600";
    toast.style.boxShadow = "0 10px 30px rgba(15, 23, 42, 0.12)";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    toast.style.transition = "opacity 180ms ease, transform 180ms ease";

    if (type === "success") {
        toast.textContent = "✓ " + message;
    } else if (type === "error") {
        toast.textContent = "! " + message;
    }

    toastContainer.appendChild(toast);

    requestAnimationFrame(function () {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });

    setTimeout(function () {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-8px)";
        setTimeout(function () {
            toast.remove();
        }, 200);
    }, 3000);
}


// ========================================
// M6.13 - UTC TIME HANDLING
// ========================================

function parseUtcDate(timestamp) {

    if (!timestamp) {
        return null;
    }

    const normalizedTimestamp =
        timestamp.endsWith("Z")
            ? timestamp
            : timestamp + "Z";

    return new Date(
        normalizedTimestamp
    );
}


// ========================================
// M7.6.4 - TIMETABLE CLASS STATUS
// ========================================

function getClassStatus(startTime, endTime) {

    const now = new Date();

    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

    const startParts =
        startTime.split(":");

    const endParts =
        endTime.split(":");

    const startMinutes =
        Number(startParts[0]) * 60 +
        Number(startParts[1]);

    const endMinutes =
        Number(endParts[0]) * 60 +
        Number(endParts[1]);


    if (currentMinutes < startMinutes) {

        return "upcoming";

    }


    if (currentMinutes >= startMinutes &&
        currentMinutes < endMinutes) {

        return "active";

    }


    return "completed";
}


// ========================================
// TEACHER LOGIN
// ========================================

const teacherLoginForm =
    document.querySelector("#teacher-email")?.closest("form");

if (teacherLoginForm) {

    teacherLoginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                document.getElementById("teacher-email")
                    .value.trim();

            const password =
                document.getElementById("teacher-password")
                    .value;

            const loginButton =
                teacherLoginForm.querySelector(".login-button");

            loginButton.disabled = true;
            loginButton.textContent = "Signing In...";

            try {

                const response = await fetch(
                    "http://127.0.0.1:8000/auth/teacher/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    }
                );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Invalid email or password"
                    );
                }


                sessionStorage.setItem(
                    "teacher",
                    JSON.stringify(data)
                );


                window.location.href =
                    "teacher-dashboard.html";


            } catch (error) {

                showToast(error.message, "error");

                loginButton.disabled = false;
                loginButton.textContent = "Sign In";
            }
        }
    );
}


// ========================================
// STUDENT LOGIN
// ========================================

const studentLoginForm =
    document.getElementById("student-login-form");

if (studentLoginForm) {

    studentLoginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const studentId =
                document.getElementById("student-id")
                    .value.trim();

            const password =
                document.getElementById("student-password")
                    .value;


            try {

                const response = await fetch(
                    "http://127.0.0.1:8000/auth/student/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            student_id: studentId,
                            password: password
                        })
                    }
                );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Invalid student ID or password"
                    );
                }


                sessionStorage.setItem(
                    "student",
                    JSON.stringify(data)
                );


                window.location.href =
                    "student-dashboard.html";


            } catch (error) {

                showToast(error.message, "error");
            }
        }
    );
}


// ========================================
// TEACHER DASHBOARD
// ========================================

const classList =
    document.getElementById("class-list");


if (classList) {
    console.log("CLASS LIST FOUND");

    loadTeacherTodayClasses();

    loadTeacherTotalStudents();

    loadTeacherTodaySessions();

    loadTeacherAttendanceOverview();

    loadTeacherRecentSessions();
}

// ========================================
// LOAD TEACHER CLASSES
// ========================================

async function loadTeacherClasses() {

    const teacherData =
        sessionStorage.getItem("teacher");


    if (!teacherData) {

        classList.innerHTML = `
            <p>Please log in again.</p>
        `;

        return;
    }


    const teacher =
        JSON.parse(teacherData);


    try {

        const response =
            await fetch(
                `http://127.0.0.1:8000/classes/?teacher_id=${teacher.teacher_id}`
            );


        const classes =
            await response.json();


        if (!response.ok) {

            throw new Error(
                classes.detail ||
                "Failed to load classes"
            );
        }


        if (classes.length === 0) {

            classList.innerHTML = `
                <p>No classes found.</p>
            `;

            return;
        }


        classList.innerHTML = "";


        /*
         * Check every class for an active
         * attendance session.
         */

        for (const classItem of classes) {

            let activeSession = null;


            const sessionResponse =
                await fetch(
                    `http://127.0.0.1:8000/attendance/sessions/active/${classItem.id}`
                );


            /*
             * 404 simply means that this class
             * has no active attendance session.
             *
             * We intentionally don't treat this
             * as a JavaScript error.
             */

            if (sessionResponse.ok) {

                activeSession =
                    await sessionResponse.json();
            }


            // ========================================
            // CLASS CARD
            // ========================================

            const card =
                document.createElement("div");


            card.className =
                "class-card";


            // ========================================
            // ACTIVE SESSION
            // ========================================

            if (activeSession) {

                card.innerHTML = `

                    <div class="class-info">

                        <h3>
                            ${classItem.name}
                        </h3>

                        <p>
                            ${classItem.subject}
                        </p>

                        <span class="class-time">
                            ${classItem.day_of_week} ·
                            ${classItem.start_time} –
                            ${classItem.end_time}
                        </span>

                        <span class="attendance-active">
                            ● Attendance Active
                        </span>

                    </div>


                    <div class="class-actions">

                        <button
                            type="button"
                            class="btn btn-primary show-qr-btn"
                        >
                            Show QR
                        </button>


                        <button
                            type="button"
                            class="btn btn-danger stop-session-card-btn"
                        >
                            Stop Session
                        </button>

                    </div>

                `;


                // ========================================
                // SHOW QR
                // ========================================

                const showQrButton =
                    card.querySelector(
                        ".show-qr-btn"
                    );


                showQrButton.addEventListener(
                    "click",
                    function () {

                        activeAttendanceSessionId =
                            activeSession.id;


                        showAttendanceQr(
                            activeSession,
                            classItem
                        );
                    }
                );


                // ========================================
                // STOP SESSION
                // ========================================

                const stopButton =
                    card.querySelector(
                        ".stop-session-card-btn"
                    );


                stopButton.addEventListener(
                    "click",
                    function () {

                        stopAttendanceSession(
                            activeSession.id
                        );
                    }
                );


            } else {


                // ========================================
                // NO ACTIVE SESSION
                // ========================================

                card.innerHTML = `

                    <div class="class-info">

                        <h3>
                            ${classItem.name}
                        </h3>

                        <p>
                            ${classItem.subject}
                        </p>

                        <span class="class-time">
                            ${classItem.day_of_week} ·
                            ${classItem.start_time} –
                            ${classItem.end_time}
                        </span>

                    </div>


                    <button
                        type="button"
                        class="btn btn-primary start-attendance-btn"
                    >
                        Start Attendance
                    </button>

                `;


                const startButton =
                    card.querySelector(
                        ".start-attendance-btn"
                    );


                startButton.addEventListener(
                    "click",
                    function () {

                        startAttendance(
                            classItem.id,
                            classItem
                        );
                    }
                );
            }


            classList.appendChild(card);
        }


    } catch (error) {

        console.error(
            "Class loading error:",
            error
        );


        classList.innerHTML = `
            <p>Unable to load classes.</p>
        `;
    }
}



// ========================================
// M8.1 - DYNAMIC TOTAL STUDENTS
// ========================================

async function loadTeacherTotalStudents() {

    const totalStudentsCount =
        document.getElementById("total-students-count");

    if (!totalStudentsCount) {
        return;
    }

    const teacherData =
        sessionStorage.getItem("teacher");

    if (!teacherData) {
        totalStudentsCount.textContent = "--";
        return;
    }

    try {

        const teacher =
            JSON.parse(teacherData);

        if (!teacher.faculty_id) {
            totalStudentsCount.textContent = "--";
            return;
        }

        // Get teacher's timetable
        const response =
            await fetch(
                `http://127.0.0.1:8000/schedules/faculty/${teacher.faculty_id}`
            );

        const timetable =
            await response.json();

        if (!response.ok) {
            throw new Error(
                timetable.detail ||
                "Failed to load timetable"
            );
        }

        // Get unique class IDs
        const classIds =
            [
                ...new Set(
                    timetable
                        .map(entry => entry.class_id)
                        .filter(Boolean)
                )
            ];

        const students = [];

        // Get students from each class
        for (const classId of classIds) {

            const studentResponse =
                await fetch(
                    `http://127.0.0.1:8000/classes/${classId}/students`
                );

            if (!studentResponse.ok) {
                continue;
            }

            const classStudents =
                await studentResponse.json();

            students.push(
                ...classStudents
            );
        }

        // Remove duplicate students
        const uniqueStudents =
            new Map();

        students.forEach(
            function (student) {
                uniqueStudents.set(
                    student.id,
                    student
                );
            }
        );

        totalStudentsCount.textContent =
            uniqueStudents.size;

    } catch (error) {

        console.error(
            "Total students loading error:",
            error
        );

        totalStudentsCount.textContent =
            "--";
    }
}



// ========================================
// M8.2 - DYNAMIC TODAY'S SESSIONS
// ========================================

async function loadTeacherTodaySessions() {

    const todaySessionsCount =
        document.getElementById(
            "today-sessions-count"
        );

    if (!todaySessionsCount) {
        return;
    }

    const teacherData =
        sessionStorage.getItem("teacher");

    if (!teacherData) {
        todaySessionsCount.textContent = "--";
        return;
    }

    try {

        const teacher =
            JSON.parse(teacherData);

        if (!teacher.teacher_id) {
            todaySessionsCount.textContent = "--";
            return;
        }

        // ========================================
        // GET TEACHER ATTENDANCE SESSIONS
        // ========================================

        const response =
            await fetch(
                `http://127.0.0.1:8000/attendance/teacher/${teacher.teacher_id}`
            );

        const sessions =
            await response.json();

        if (!response.ok) {

            throw new Error(
                sessions.detail ||
                "Failed to load attendance sessions"
            );
        }

        // ========================================
        // GET TODAY'S DATE
        // ========================================

        const today =
            new Date().toLocaleDateString(
                "en-IN"
            );

        // ========================================
        // FILTER TODAY'S SESSIONS
        // ========================================

        const todaySessions =
            sessions.filter(
                function (session) {

                    const sessionDate =
                        parseUtcDate(
                            session.start_time
                        );

                    if (!sessionDate) {
                        return false;
                    }

                    return (
                        sessionDate.toLocaleDateString(
                            "en-IN"
                        ) === today
                    );

                }
            );

        // ========================================
        // DISPLAY COUNT
        // ========================================

        todaySessionsCount.textContent =
            todaySessions.length;

    } catch (error) {

        console.error(
            "Today's sessions loading error:",
            error
        );

        todaySessionsCount.textContent =
            "--";
    }
}



// ========================================
// M8.3 - RECENT ATTENDANCE SESSIONS
// ========================================

async function loadTeacherRecentSessions() {

    const recentSessionList =
        document.getElementById(
            "recent-session-list"
        );

    if (!recentSessionList) {
        return;
    }

    const teacherData =
        sessionStorage.getItem("teacher");

    if (!teacherData) {

        recentSessionList.innerHTML =
            "<p>Please log in again.</p>";

        return;
    }

    try {

        const teacher =
            JSON.parse(teacherData);

        const response =
            await fetch(
                `http://127.0.0.1:8000/attendance/teacher/${teacher.teacher_id}`
            );

        const sessions =
            await response.json();

        if (!response.ok) {

            throw new Error(
                sessions.detail ||
                "Failed to load recent sessions"
            );
        }

        if (sessions.length === 0) {

            recentSessionList.innerHTML =
                "<p>No attendance sessions yet.</p>";

            return;
        }

        recentSessionList.innerHTML =
            sessions.map(
                function (session) {

                    const sessionDate =
                        parseUtcDate(
                            session.start_time
                        );

                    let dateText = "--";

                    if (sessionDate) {

                        const today =
                            new Date();

                        const yesterday =
                            new Date();

                        yesterday.setDate(
                            yesterday.getDate() - 1
                        );

                        if (
                            sessionDate.toLocaleDateString(
                                "en-IN"
                            ) ===
                            today.toLocaleDateString(
                                "en-IN"
                            )
                        ) {

                            dateText = "Today";

                        } else if (
                            sessionDate.toLocaleDateString(
                                "en-IN"
                            ) ===
                            yesterday.toLocaleDateString(
                                "en-IN"
                            )
                        ) {

                            dateText = "Yesterday";

                        } else {

                            dateText =
                                sessionDate.toLocaleDateString(
                                    "en-IN",
                                    {
                                        day: "2-digit",
                                        month: "short"
                                    }
                                );
                        }
                    }

                    return `
                        <div
                            class="session-row"
                            data-session-id="${session.session_id}"
                            style="cursor: pointer;"
                        >

                            <span>
                                ${session.subject}
                                ·
                                ${session.class_name}
                            </span>

                            <span>
                                ${session.present_count}
                                /
                                ${session.total_students}
                            </span>

                            <span>
                                ${dateText}
                            </span>

                        </div>
                    `;
                }
            ).join("");


        // ========================================
        // M8.4 - SESSION DETAILS CLICK
        // ========================================

        const sessionRows =
            recentSessionList.querySelectorAll(
                ".session-row"
            );

        sessionRows.forEach(
            function (row) {

                row.addEventListener(
                    "click",
                    function () {

                        const sessionId =
                            row.dataset.sessionId;

                        loadAttendanceSessionDetails(
                            sessionId
                        );
                    }
                );
            }
        );


    } catch (error) {

        console.error(
            "Recent sessions error:",
            error
        );

        recentSessionList.innerHTML =
            "<p>Unable to load recent sessions.</p>";
    }
}



// ========================================
// M8.4 - ATTENDANCE SESSION DETAILS
// ========================================

async function loadAttendanceSessionDetails(
    sessionId
) {

    if (!sessionId) {
        return;
    }

    try {

        const response =
            await fetch(
                `http://127.0.0.1:8000/attendance/session/${sessionId}`
            );

        const session =
            await response.json();

        if (!response.ok) {

            throw new Error(
                session.detail ||
                "Failed to load attendance details"
            );
        }


        // ========================================
        // CREATE MODAL
        // ========================================

        let modal =
            document.getElementById(
                "attendance-session-details-modal"
            );


        if (!modal) {

            modal =
                document.createElement("div");

            modal.id =
                "attendance-session-details-modal";

            modal.style.position =
                "fixed";

            modal.style.inset =
                "0";

            modal.style.background =
                "rgba(15, 23, 42, 0.45)";

            modal.style.display =
                "flex";

            modal.style.alignItems =
                "center";

            modal.style.justifyContent =
                "center";

            modal.style.padding =
                "24px";

            modal.style.zIndex =
                "99998";

            modal.innerHTML = `
                <div
                    style="
                        width: min(720px, 100%);
                        max-height: 85vh;
                        overflow-y: auto;
                        background: #ffffff;
                        border-radius: 16px;
                        padding: 28px;
                        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.20);
                    "
                >

                    <div
                        style="
                            display: flex;
                            align-items: flex-start;
                            justify-content: space-between;
                            gap: 20px;
                            margin-bottom: 24px;
                        "
                    >

                        <div>

                            <h2
                                id="session-details-title"
                                style="
                                    margin: 0 0 6px;
                                    color: #0f172a;
                                    font-size: 22px;
                                "
                            ></h2>

                            <p
                                id="session-details-subtitle"
                                style="
                                    margin: 0;
                                    color: #64748b;
                                    font-size: 14px;
                                "
                            ></p>

                        </div>

                        <button
                            type="button"
                            id="close-session-details"
                            style="
                                border: none;
                                background: #f1f5f9;
                                color: #475569;
                                width: 36px;
                                height: 36px;
                                border-radius: 10px;
                                cursor: pointer;
                                font-size: 18px;
                            "
                        >
                            ×
                        </button>

                    </div>


                    <div
                        id="session-details-summary"
                        style="
                            display: grid;
                            grid-template-columns:
                                repeat(3, 1fr);
                            gap: 12px;
                            margin-bottom: 24px;
                        "
                    ></div>


                    <div>

                        <h3
                            style="
                                margin: 0 0 14px;
                                color: #0f172a;
                                font-size: 16px;
                            "
                        >
                            Student Attendance
                        </h3>

                        <div
                            id="session-student-list"
                        ></div>

                    </div>

                </div>
            `;

            document.body.appendChild(modal);


            // ========================================
            // CLOSE MODAL
            // ========================================

            document
                .getElementById(
                    "close-session-details"
                )
                .addEventListener(
                    "click",
                    function () {

                        modal.remove();
                    }
                );


            modal.addEventListener(
                "click",
                function (event) {

                    if (event.target === modal) {

                        modal.remove();
                    }
                }
            );
        }


        // ========================================
        // SESSION INFORMATION
        // ========================================

        const sessionTitle =
            document.getElementById(
                "session-details-title"
            );

        const sessionSubtitle =
            document.getElementById(
                "session-details-subtitle"
            );


        if (sessionTitle) {

            sessionTitle.textContent =
                session.subject;
        }


        if (sessionSubtitle) {

            sessionSubtitle.textContent =
                `${session.class_name} · Session #${sessionId}`;
        }


        // ========================================
        // FORMAT SESSION TIME
        // ========================================

        const startDate =
            parseUtcDate(
                session.start_time
            );

        const endDate =
            parseUtcDate(
                session.end_time
            );


        let sessionTime =
            "--";


        if (startDate && endDate) {

            const startTime =
                startDate.toLocaleTimeString(
                    "en-IN",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

            const endTime =
                endDate.toLocaleTimeString(
                    "en-IN",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

            sessionTime =
                `${startTime} – ${endTime}`;
        }


        // ========================================
        // SUMMARY CARDS
        // ========================================

        const summary =
            document.getElementById(
                "session-details-summary"
            );


        if (summary) {

            summary.innerHTML = `

                <div
                    style="
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 16px;
                    "
                >

                    <div
                        style="
                            color: #64748b;
                            font-size: 12px;
                            margin-bottom: 6px;
                        "
                    >
                        Present
                    </div>

                    <strong
                        style="
                            color: #16a34a;
                            font-size: 22px;
                        "
                    >
                        ${session.present}
                    </strong>

                </div>


                <div
                    style="
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 16px;
                    "
                >

                    <div
                        style="
                            color: #64748b;
                            font-size: 12px;
                            margin-bottom: 6px;
                        "
                    >
                        Total Students
                    </div>

                    <strong
                        style="
                            color: #0f172a;
                            font-size: 22px;
                        "
                    >
                        ${session.total_students}
                    </strong>

                </div>


                <div
                    style="
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 16px;
                    "
                >

                    <div
                        style="
                            color: #64748b;
                            font-size: 12px;
                            margin-bottom: 6px;
                        "
                    >
                        Time
                    </div>

                    <strong
                        style="
                            color: #0f172a;
                            font-size: 16px;
                        "
                    >
                        ${sessionTime}
                    </strong>

                </div>
            `;
        }


        // ========================================
        // STUDENT LIST
        // ========================================

        const studentList =
            document.getElementById(
                "session-student-list"
            );


        if (!studentList) {
            return;
        }


        if (
            !session.students ||
            session.students.length === 0
        ) {

            studentList.innerHTML = `
                <p
                    style="
                        color: #64748b;
                        font-size: 14px;
                    "
                >
                    No students found.
                </p>
            `;

            return;
        }


        studentList.innerHTML =
            session.students.map(
                function (student) {

                    const markedDate =
                        parseUtcDate(
                            student.marked_at
                        );


                    let markedTime =
                        "--";


                    if (markedDate) {

                        markedTime =
                            markedDate.toLocaleTimeString(
                                "en-IN",
                                {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                }
                            );
                    }


                    const isPresent =
                        student.status === "present";


                    return `
                        <div
                            style="
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                gap: 16px;
                                padding: 14px 0;
                                border-bottom: 1px solid #e2e8f0;
                            "
                        >

                            <div>

                                <strong
                                    style="
                                        display: block;
                                        color: #0f172a;
                                        font-size: 14px;
                                    "
                                >
                                    ${student.name}
                                </strong>

                                <span
                                    style="
                                        color: #64748b;
                                        font-size: 13px;
                                    "
                                >
                                    ${student.student_id}
                                </span>

                            </div>


                            <div
                                style="
                                    text-align: right;
                                "
                            >

                                <span
                                    style="
                                        display: inline-block;
                                        padding: 4px 9px;
                                        border-radius: 999px;
                                        background: ${
                                            isPresent
                                                ? "#dcfce7"
                                                : "#f1f5f9"
                                        };
                                        color: ${
                                            isPresent
                                                ? "#166534"
                                                : "#64748b"
                                        };
                                        font-size: 12px;
                                        font-weight: 600;
                                    "
                                >
                                    ${
                                        isPresent
                                            ? "Present"
                                            : "Absent"
                                    }
                                </span>

                                ${
                                    isPresent
                                        ? `
                                            <small
                                                style="
                                                    display: block;
                                                    margin-top: 4px;
                                                    color: #94a3b8;
                                                    font-size: 11px;
                                                "
                                            >
                                                ${markedTime}
                                            </small>
                                        `
                                        : `
                                            <button
                                                type="button"
                                                class="manual-mark-btn"
                                                data-student-id="${student.student_id}"
                                                style="
                                                    display: block;
                                                    margin-top: 8px;
                                                    padding: 6px 10px;
                                                    border: none;
                                                    border-radius: 7px;
                                                    background: #2563eb;
                                                    color: white;
                                                    font-size: 12px;
                                                    font-weight: 600;
                                                    cursor: pointer;
                                                "
                                            >
                                                Mark Present
                                            </button>
                                        `
                                }

                            </div>

                        </div>
                    `;
                }
            ).join("");



            // ========================================
            // M8.5 - MANUAL MARK PRESENT BUTTONS
            // ========================================

            const manualMarkButtons =
                studentList.querySelectorAll(
                    ".manual-mark-btn"
                );

            manualMarkButtons.forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const studentId =
                                button.dataset.studentId;

                            markStudentPresent(
                                session.session_id,
                                studentId,
                                button
                            );
                        }
                    );

                }
            );

        

    } catch (error) {

        console.error(
            "Session details error:",
            error
        );

        const errorMessage =
            error instanceof Error
                ? error.message
                : (
                    error?.detail ||
                    error?.message ||
                    "Unable to load attendance details."
                );

        showToast(
            errorMessage,
            "error"
        );
    }
}




// ========================================
// M8.5 - TEACHER MARK STUDENT PRESENT
// ========================================

async function markStudentPresent(
    sessionId,
    studentId,
    button
) {

    const teacherData =
        sessionStorage.getItem(
            "teacher"
        );

    if (!teacherData) {

        showToast(
            "Please log in again.",
            "error"
        );

        return;
    }

    const teacher =
        JSON.parse(
            teacherData
        );


    if (!teacher.teacher_id) {

        showToast(
            "Teacher information is unavailable.",
            "error"
        );

        return;
    }


    const confirmed =
        confirm(
            "Mark this student as present?"
        );


    if (!confirmed) {
        return;
    }


    try {

        button.disabled = true;

        button.textContent =
            "Marking...";


        const response =
            await fetch(
                `http://127.0.0.1:8000/attendance/teacher/${teacher.teacher_id}/session/${sessionId}/mark`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        student_id:
                            studentId
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to mark attendance"
            );
        }


        showToast(
            "Attendance marked successfully.",
            "success"
        );


        // Reload the modal
        await loadAttendanceSessionDetails(
            sessionId
        );


        // Refresh recent session counts
        await loadTeacherRecentSessions();


        // Refresh attendance overview
        await loadTeacherAttendanceOverview();


    } catch (error) {

        console.error(
            "Manual attendance error:",
            error
        );


        showToast(
            error.message ||
            "Unable to mark attendance.",
            "error"
        );


        button.disabled = false;

        button.textContent =
            "Mark Present";
    }
}




// ========================================
// M8.1 - TEACHER ATTENDANCE OVERVIEW
// ========================================

async function loadTeacherAttendanceOverview() {

    const overviewContainer =
        document.getElementById(
            "teacher-attendance-overview"
        );

    const averageAttendance =
        document.getElementById(
            "average-attendance-count"
        );

    if (!overviewContainer) {
        return;
    }

    const teacherData =
        sessionStorage.getItem("teacher");

    if (!teacherData) {
        overviewContainer.innerHTML =
            "<p>Please log in again.</p>";

        return;
    }

    try {

        const teacher =
            JSON.parse(teacherData);

        if (!teacher.faculty_id) {
            overviewContainer.innerHTML =
                "<p>No faculty information is available.</p>";

            return;
        }

        // ========================================
        // GET TEACHER TIMETABLE
        // ========================================

        const timetableResponse =
            await fetch(
                `http://127.0.0.1:8000/schedules/faculty/${teacher.faculty_id}`
            );

        const timetable =
            await timetableResponse.json();

        if (!timetableResponse.ok) {
            throw new Error(
                timetable.detail ||
                "Failed to load timetable"
            );
        }

        // ========================================
        // GET UNIQUE CLASS IDs
        // ========================================

        const classIds = [
            ...new Set(
                timetable
                    .map(entry => entry.class_id)
                    .filter(Boolean)
            )
        ];

        if (classIds.length === 0) {

            overviewContainer.innerHTML =
                "<p>No classes found.</p>";

            if (averageAttendance) {
                averageAttendance.textContent = "--";
            }

            return;
        }

        // ========================================
        // GET ATTENDANCE FOR EACH CLASS
        // ========================================

        const attendanceData = [];

        for (const classId of classIds) {

            const response =
                await fetch(
                    `http://127.0.0.1:8000/attendance/class/${classId}`
                );

            if (!response.ok) {
                continue;
            }

            const data =
                await response.json();

            attendanceData.push(data);
        }

        if (attendanceData.length === 0) {

            overviewContainer.innerHTML =
                "<p>No attendance data available.</p>";

            if (averageAttendance) {
                averageAttendance.textContent = "--";
            }

            return;
        }

        // ========================================
        // CALCULATE AVERAGE ATTENDANCE
        // ========================================

        const classPercentages =
            attendanceData.map(
                function (classData) {

                    if (
                        !classData.students ||
                        classData.students.length === 0
                    ) {
                        return 0;
                    }

                    const total =
                        classData.students.reduce(
                            function (sum, student) {

                                return sum +
                                    Number(
                                        student.attendance_percentage || 0
                                    );

                            },
                            0
                        );

                    return total /
                        classData.students.length;
                }
            );


        const totalPercentage =
            classPercentages.reduce(
                function (total, percentage) {

                    return total + percentage;

                },
                0
            );


        const average =
            totalPercentage /
            classPercentages.length;

        if (averageAttendance) {

            averageAttendance.textContent =
                `${average.toFixed(1)}%`;
        }

        // ========================================
        // RENDER ATTENDANCE OVERVIEW
        // ========================================

        overviewContainer.innerHTML =
            attendanceData.map(
                function (classData) {

                    return `
                        <div class="attendance-item">
                            <span>
                                ${classData.class_name}
                            </span>

                            <strong>
                                ${(
                                classData.students &&
                                classData.students.length > 0
                                    ? classData.students.reduce(
                                        function (sum, student) {
                                            return sum +
                                                Number(
                                                    student.attendance_percentage || 0
                                                );
                                        },
                                        0
                                    ) / classData.students.length
                                    : 0
                            ).toFixed(1)}%
                            </strong>
                        </div>
                    `;

                }
            ).join("");

    } catch (error) {

        console.error(
            "Teacher attendance overview error:",
            error
        );

        overviewContainer.innerHTML =
            "<p>Unable to load attendance data.</p>";

        if (averageAttendance) {
            averageAttendance.textContent = "--";
        }
    }
}



// ========================================
// M8.6 - TEACHER ATTENDANCE REPORTS
// ========================================

const viewReportsButton =
    document.getElementById(
        "view-reports-btn"
    );


if (viewReportsButton) {

    viewReportsButton.addEventListener(
        "click",
        function () {

            loadTeacherAttendanceReports();

        }
    );

}


async function loadTeacherAttendanceReports() {

    const teacherData =
        sessionStorage.getItem(
            "teacher"
        );


    if (!teacherData) {

        showToast(
            "Please log in again.",
            "error"
        );

        return;

    }


    try {

        const teacher =
            JSON.parse(
                teacherData
            );


        // ========================================
        // GET TEACHER'S CLASSES
        // ========================================

        const classResponse =
            await fetch(
                `http://127.0.0.1:8000/classes/?teacher_id=${teacher.teacher_id}`
            );


        const classes =
            await classResponse.json();


        if (!classResponse.ok) {

            throw new Error(
                classes.detail ||
                "Failed to load classes"
            );

        }


        if (
            !classes ||
            classes.length === 0
        ) {

            showToast(
                "No classes found.",
                "info"
            );

            return;

        }


        // ========================================
        // GET ATTENDANCE FOR EACH CLASS
        // ========================================

        const reports = [];


        for (
            const classItem
            of classes
        ) {

            const response =
                await fetch(
                    `http://127.0.0.1:8000/attendance/class/${classItem.id}`
                );


            if (!response.ok) {
                continue;
            }


            const report =
                await response.json();

            if (
                report.students &&
                report.students.length > 0
            ) {
                reports.push(report);
            }

        }


        if (reports.length === 0) {

            showToast(
                "No attendance reports available.",
                "info"
            );

            return;

        }


        // ========================================
        // CREATE REPORT MODAL
        // ========================================

        let modal =
            document.getElementById(
                "teacher-attendance-report-modal"
            );


        if (modal) {

            modal.remove();

        }


        modal =
            document.createElement(
                "div"
            );


        modal.id =
            "teacher-attendance-report-modal";


        modal.style.position =
            "fixed";

        modal.style.inset =
            "0";

        modal.style.background =
            "rgba(15, 23, 42, 0.45)";

        modal.style.display =
            "flex";

        modal.style.alignItems =
            "center";

        modal.style.justifyContent =
            "center";

        modal.style.padding =
            "24px";

        modal.style.zIndex =
            "99998";


        modal.innerHTML = `

            <div
                style="
                    width: min(900px, 100%);
                    max-height: 85vh;
                    overflow-y: auto;
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 28px;
                    box-shadow:
                        0 20px 60px
                        rgba(15, 23, 42, 0.20);
                "
            >

                <div
                    style="
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 20px;
                        margin-bottom: 24px;
                    "
                >

                    <div>

                        <p
                            style="
                                margin: 0 0 6px;
                                color: #2563eb;
                                font-size: 12px;
                                font-weight: 700;
                                letter-spacing: 0.12em;
                            "
                        >
                            REPORTS
                        </p>

                        <h2
                            style="
                                margin: 0;
                                color: #0f172a;
                                font-size: 24px;
                            "
                        >
                            Attendance Reports
                        </h2>

                        <p
                            style="
                                margin: 6px 0 0;
                                color: #64748b;
                                font-size: 14px;
                            "
                        >
                            Student attendance across your classes.
                        </p>

                    </div>


                    <button
                        type="button"
                        id="close-teacher-report"
                        style="
                            border: none;
                            background: #f1f5f9;
                            color: #475569;
                            width: 36px;
                            height: 36px;
                            border-radius: 10px;
                            cursor: pointer;
                            font-size: 18px;
                        "
                    >
                        ×
                    </button>

                </div>


                <div id="teacher-report-content"></div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        const reportContent =
            document.getElementById(
                "teacher-report-content"
            );


        reportContent.innerHTML =
            reports.map(
                function (report) {

                    const students =
                        report.students || [];


                    return `

                        <div
                            style="
                                margin-bottom: 24px;
                                border: 1px solid #e2e8f0;
                                border-radius: 14px;
                                overflow: hidden;
                            "
                        >

                            <div
                                style="
                                    padding: 18px;
                                    background: #f8fafc;
                                    border-bottom: 1px solid #e2e8f0;
                                "
                            >

                                <h3
                                    style="
                                        margin: 0 0 6px;
                                        color: #0f172a;
                                        font-size: 18px;
                                    "
                                >
                                    ${report.class_name}
                                </h3>

                                <p
                                    style="
                                        margin: 0;
                                        color: #64748b;
                                        font-size: 13px;
                                    "
                                >
                                    ${report.total_sessions}
                                    attendance sessions
                                </p>

                            </div>


                            <div
                                style="
                                    overflow-x: auto;
                                "
                            >

                                <table
                                    style="
                                        width: 100%;
                                        border-collapse: collapse;
                                    "
                                >

                                    <thead>

                                        <tr>

                                            <th
                                                style="
                                                    padding: 12px 16px;
                                                    text-align: left;
                                                    color: #64748b;
                                                    font-size: 12px;
                                                "
                                            >
                                                Student
                                            </th>

                                            <th
                                                style="
                                                    padding: 12px 16px;
                                                    text-align: center;
                                                    color: #64748b;
                                                    font-size: 12px;
                                                "
                                            >
                                                Present
                                            </th>

                                            <th
                                                style="
                                                    padding: 12px 16px;
                                                    text-align: center;
                                                    color: #64748b;
                                                    font-size: 12px;
                                                "
                                            >
                                                Absent
                                            </th>

                                            <th
                                                style="
                                                    padding: 12px 16px;
                                                    text-align: right;
                                                    color: #64748b;
                                                    font-size: 12px;
                                                "
                                            >
                                                Attendance
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        ${
                                            students.length > 0

                                            ? students.map(
                                                function (student) {

                                                    const percentage =
                                                        Number(
                                                            student.attendance_percentage || 0
                                                        );

                                                    return `

                                                        <tr>

                                                            <td
                                                                style="
                                                                    padding: 14px 16px;
                                                                    border-top: 1px solid #e2e8f0;
                                                                "
                                                            >

                                                                <strong>
                                                                    ${student.name}
                                                                </strong>

                                                                <div
                                                                    style="
                                                                        margin-top: 3px;
                                                                        color: #64748b;
                                                                        font-size: 12px;
                                                                    "
                                                                >
                                                                    ${student.student_id}
                                                                </div>

                                                            </td>


                                                            <td
                                                                style="
                                                                    padding: 14px 16px;
                                                                    text-align: center;
                                                                    border-top: 1px solid #e2e8f0;
                                                                "
                                                            >
                                                                ${student.present}
                                                            </td>


                                                            <td
                                                                style="
                                                                    padding: 14px 16px;
                                                                    text-align: center;
                                                                    border-top: 1px solid #e2e8f0;
                                                                "
                                                            >
                                                                ${student.absent}
                                                            </td>


                                                            <td
                                                                style="
                                                                    padding: 14px 16px;
                                                                    text-align: right;
                                                                    border-top: 1px solid #e2e8f0;
                                                                    font-weight: 700;
                                                                    color: ${
                                                                        percentage < 75
                                                                            ? "#dc2626"
                                                                            : "#16a34a"
                                                                    };
                                                                "
                                                            >
                                                                ${percentage.toFixed(1)}%
                                                            </td>

                                                        </tr>

                                                    `;

                                                }
                                            ).join("")

                                            : `
                                                <tr>

                                                    <td
                                                        colspan="4"
                                                        style="
                                                            padding: 24px;
                                                            text-align: center;
                                                            color: #64748b;
                                                        "
                                                    >
                                                        No students found.
                                                    </td>

                                                </tr>
                                            `
                                        }

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    `;

                }
            ).join("");


        // ========================================
        // CLOSE REPORT MODAL
        // ========================================

        const closeButton =
            document.getElementById(
                "close-teacher-report"
            );


        closeButton.addEventListener(
            "click",
            function () {

                modal.remove();

            }
        );


        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    modal.remove();

                }

            }
        );


    } catch (error) {

        console.error(
            "Teacher report error:",
            error
        );


        showToast(
            error.message ||
            "Unable to load attendance reports.",
            "error"
        );

    }

}



// ========================================
// M7.6.2 - TEACHER TODAY'S CLASSES
// ========================================

async function loadTeacherTodayClasses() {

    const teacherData =
        sessionStorage.getItem("teacher");

    if (!teacherData) {

        classList.innerHTML = `
            <p>Please log in again.</p>
        `;

        return;
    }

    const teacher =
        JSON.parse(teacherData);

    if (!teacher.faculty_id) {

        classList.innerHTML = `
            <p>
                No faculty information is available.
            </p>
        `;

        return;
    }

    try {

        // ========================================
        // GET TEACHER TIMETABLE
        // ========================================

        const response =
            await fetch(
                `http://127.0.0.1:8000/schedules/faculty/${teacher.faculty_id}`
            );

        const timetable =
            await response.json();

        if (!response.ok) {

            throw new Error(
                timetable.detail ||
                "Failed to load teacher timetable"
            );
        }


        // ========================================
        // GET TODAY
        // ========================================

        const today =
            new Date().toLocaleDateString(
                "en-US",
                {
                    weekday: "long"
                }
            );


        // ========================================
        // FILTER TODAY'S CLASSES
        // ========================================

        const todayClasses =
            timetable.filter(
                function (entry) {
                    return entry.day_of_week === today;
                }
            );



        // ========================================
        // M8.2 - UPDATE CLASSES TODAY
        // ========================================

        const classesTodayCount =
            document.getElementById(
                "classes-today-count"
            );

        if (classesTodayCount) {
            classesTodayCount.textContent =
                todayClasses.length;
        }


        // ========================================
        // NO CLASS TODAY
        // ========================================

        if (todayClasses.length === 0) {

            classList.innerHTML = `
                <p>
                    No classes scheduled for today.
                </p>
            `;

            return;
        }


        // ========================================
        // CLEAR CLASS LIST
        // ========================================

        classList.innerHTML = "";


        // ========================================
        // RENDER TODAY'S CLASSES
        // ========================================

        for (
            const entry of todayClasses
        ) {

            const card =
                document.createElement("div");

            card.className =
                "class-card";


            // ========================================
            // CHECK ACTIVE ATTENDANCE SESSION
            // ========================================

            let activeSession = null;

            if (entry.class_id) {

                const sessionResponse =
                    await fetch(
                        `http://127.0.0.1:8000/attendance/sessions/active/${entry.class_id}`
                    );

                if (sessionResponse.ok) {

                    activeSession =
                        await sessionResponse.json();
                }
            }


            // ========================================
            // ACTIVE SESSION
            // ========================================

            if (activeSession) {

                card.innerHTML = `

                    <div class="class-info">

                        <h3>
                            ${entry.subject}
                        </h3>

                        <p>
                            ${entry.batch}
                        </p>

                        <span class="class-time">
                            ${entry.start_time} –
                            ${entry.end_time}
                        </span>

                        <span class="attendance-active">
                            ● Attendance Active
                        </span>

                    </div>


                    <div class="class-actions">

                        <button
                            type="button"
                            class="btn btn-primary show-qr-btn"
                        >
                            Show QR
                        </button>

                        <button
                            type="button"
                            class="btn btn-danger stop-session-card-btn"
                        >
                            Stop Session
                        </button>

                    </div>

                `;


                // ========================================
                // SHOW QR
                // ========================================

                const showQrButton =
                    card.querySelector(
                        ".show-qr-btn"
                    );

                showQrButton.addEventListener(
                    "click",
                    function () {

                        activeAttendanceSessionId =
                            activeSession.id;

                        showAttendanceQr(
                            activeSession,
                            {
                                name: entry.batch,
                                subject: entry.subject,
                                day_of_week:
                                    entry.day_of_week,
                                start_time:
                                    entry.start_time,
                                end_time:
                                    entry.end_time
                            }
                        );
                    }
                );


                // ========================================
                // STOP SESSION
                // ========================================

                const stopButton =
                    card.querySelector(
                        ".stop-session-card-btn"
                    );

                stopButton.addEventListener(
                    "click",
                    function () {

                        stopAttendanceSession(
                            activeSession.id
                        );
                    }
                );


            } else {

    // ========================================
    // M7.6.4 - CLASS TIME STATUS
    // ========================================

    const classStatus =
        getClassStatus(
            entry.start_time,
            entry.end_time
        );


    let statusText = "";
    let buttonText = "Start Attendance";
    let buttonDisabled = false;


    if (classStatus === "upcoming") {

        statusText = `
            <span class="attendance-upcoming">
                ● Upcoming
            </span>
        `;

        buttonText = "Start Attendance";
        buttonDisabled = true;

    }


    if (classStatus === "active") {

        statusText = `
            <span class="attendance-active">
                ● Class in Progress
            </span>
        `;

        buttonText = "Start Attendance";
        buttonDisabled = false;

    }


    if (classStatus === "completed") {

        statusText = `
            <span class="attendance-completed">
                ● Completed
            </span>
        `;

        buttonText = "Attendance Closed";
        buttonDisabled = true;

    }


    // ========================================
    // RENDER CLASS CARD
    // ========================================

    card.innerHTML = `

        <div class="class-info">

            <h3>
                ${entry.subject}
            </h3>

            <p>
                ${entry.batch}
            </p>

            <span class="class-time">
                ${entry.start_time} –
                ${entry.end_time}
            </span>

            ${
                entry.room
                    ? `
                        <span class="class-room">
                            ${entry.room}
                        </span>
                    `
                    : ""
            }

            ${statusText}

        </div>


        <button
            type="button"
            class="btn btn-primary start-attendance-btn"
            ${buttonDisabled ? "disabled" : ""}
        >
            ${buttonText}
        </button>

    `;


    // ========================================
    // START ATTENDANCE
    // ========================================

    const startButton =
        card.querySelector(
            ".start-attendance-btn"
        );


    if (!buttonDisabled) {

        startButton.addEventListener(
            "click",
            function () {

                startAttendance(
                    entry.class_id,
                    {
                        name: entry.batch,
                        subject: entry.subject,
                        day_of_week:
                            entry.day_of_week,
                        start_time:
                            entry.start_time,
                        end_time:
                            entry.end_time
                    }
                );

            }
        );

    }

}

            


            classList.appendChild(card);
        }


    } catch (error) {

        console.error(
            "Teacher today's classes error:",
            error
        );

        classList.innerHTML = `
            <p>
                Unable to load today's classes.
            </p>
        `;
    }
}



// ========================================
// M7.4.4 - TEACHER TIMETABLE
// ========================================

const teacherTimetable =
    document.getElementById(
        "teacher-timetable"
    );


if (teacherTimetable) {

    loadTeacherTimetable();

}


async function loadTeacherTimetable() {

    const teacherData =
        sessionStorage.getItem(
            "teacher"
        );


    if (!teacherData) {

        teacherTimetable.innerHTML = `
            <p>Please log in again.</p>
        `;

        return;

    }


    const teacher =
        JSON.parse(
            teacherData
        );


    if (!teacher.faculty_id) {

        teacherTimetable.innerHTML = `
            <p>
                No faculty information is available.
            </p>
        `;

        return;

    }


    try {

        const response =
            await fetch(
                `http://127.0.0.1:8000/schedules/faculty/${teacher.faculty_id}`
            );


        const timetable =
            await response.json();


        if (!response.ok) {

            throw new Error(
                timetable.detail ||
                "Failed to load timetable"
            );

        }


        if (timetable.length === 0) {

            teacherTimetable.innerHTML = `
                <p>
                    No timetable entries found.
                </p>
            `;

            return;

        }


        // ========================================
        // DAY ORDER
        // ========================================

        const dayOrder = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
        ];


        timetable.sort(
            function (a, b) {

                const dayDifference =
                    dayOrder.indexOf(
                        a.day_of_week
                    ) -
                    dayOrder.indexOf(
                        b.day_of_week
                    );


                if (dayDifference !== 0) {

                    return dayDifference;

                }


                return a.start_time.localeCompare(
                    b.start_time
                );

            }
        );


        // ========================================
        // FORMAT TIME
        // ========================================

        function formatTime(timeString) {

            const parts =
                timeString.split(":");

            let hour =
                Number(parts[0]);

            const minute =
                parts[1];

            const period =
                hour >= 12
                    ? "PM"
                    : "AM";


            hour =
                hour % 12 || 12;


            return `${hour}:${minute} ${period}`;

        }


        // ========================================
        // GROUP BY DAY
        // ========================================

        const groupedByDay = {};


        timetable.forEach(
            function (entry) {

                if (
                    !groupedByDay[
                        entry.day_of_week
                    ]
                ) {

                    groupedByDay[
                        entry.day_of_week
                    ] = [];

                }


                groupedByDay[
                    entry.day_of_week
                ].push(entry);

            }
        );


        // ========================================
        // RENDER TIMETABLE
        // ========================================

        teacherTimetable.innerHTML = "";


        dayOrder.forEach(
            function (day) {

                const entries =
                    groupedByDay[day];


                if (!entries) {

                    return;

                }


                const dayContainer =
                    document.createElement(
                        "div"
                    );

                dayContainer.className =
                    "timetable-day";


                dayContainer.innerHTML = `
                    <div class="timetable-day-header">
                        ${day}
                    </div>
                `;


                entries.forEach(
                    function (entry) {

                        const timetableEntry =
                            document.createElement(
                                "div"
                            );

                        timetableEntry.className =
                            "timetable-entry";


                        timetableEntry.innerHTML = `
                            <div class="timetable-time">
                                ${formatTime(entry.start_time)}
                                –
                                ${formatTime(entry.end_time)}
                            </div>

                            <div>
                                <div class="timetable-subject">
                                    ${entry.subject}
                                </div>

                                <div class="timetable-batch">
                                    ${entry.batch}
                                </div>
                            </div>

                            <div class="timetable-room">
                                ${
                                    entry.room ||
                                    "Room not assigned"
                                }
                            </div>
                        `;


                        dayContainer.appendChild(
                            timetableEntry
                        );

                    }
                );


                teacherTimetable.appendChild(
                    dayContainer
                );

            }
        );


    } catch (error) {

        console.error(
            "Teacher timetable error:",
            error
        );


        teacherTimetable.innerHTML = `
            <p>
                Unable to load timetable.
            </p>
        `;

    }

}


// ========================================
// ACTIVE ATTENDANCE SESSION
// ========================================

let activeAttendanceSessionId = null;


// ========================================
// START ATTENDANCE
// ========================================

async function startAttendance(
    classId,
    classData = null
) {

    try {

        console.log(
            "Starting attendance for class:",
            classId
        );


        const response =
            await fetch(
                "http://127.0.0.1:8000/attendance/sessions",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        class_id: classId
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to start attendance"
            );
        }


        console.log(
            "Attendance session created:",
            data
        );


        activeAttendanceSessionId =
            data.id;


        /*
         * Show the QR immediately
         * after starting the session.
         */

        showAttendanceQr(
            data,

            classData || {
                name: "Class",
                subject: "Attendance"
            }
        );


        /*
         * Refresh class cards so
         * Start Attendance changes into
         * Show QR + Stop Session.
         */

        await loadTeacherTodayClasses();


    } catch (error) {

        console.error(
            "Start attendance error:",
            error
        );


        showToast(
            error.message ||
            "Unable to start attendance.",
            "error"
        );
    }
}


// ========================================
// SHOW ATTENDANCE QR
// ========================================

function showAttendanceQr(
    sessionData,
    classData
) {

    const qrContainer =
        document.getElementById(
            "attendance-qr"
        );


    if (!qrContainer) {
        return;
    }


    /*
     * Clear previous QR
     */

    qrContainer.innerHTML = "";


    /*
     * Generate QR
     */

    new QRCode(
        qrContainer,
        {
            text: sessionData.qr_token,
            width: 240,
            height: 240
        }
    );


    /*
     * Show class information
     */

    const classInfo =
        document.getElementById(
            "qr-class-info"
        );


    if (classInfo) {

        classInfo.textContent =
            `${classData.name} · ${classData.subject}`;
    }


    /*
     * Show QR expiry
     */

    const expiryElement =
        document.getElementById(
            "qr-expiry"
        );


    if (expiryElement) {

        expiryElement.textContent =
            "QR expires at: " +
            parseUtcDate(
                sessionData.qr_expires_at
            ).toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }


    /*
     * Open modal
     */

    const modal =
        document.getElementById(
            "attendance-qr-modal"
        );


    if (modal) {

        modal.classList.remove(
            "hidden"
        );
    }
}


// ========================================
// ATTENDANCE QR MODAL
// ========================================

const attendanceQrModal =
    document.getElementById(
        "attendance-qr-modal"
    );


const closeAttendanceQr =
    document.getElementById(
        "close-attendance-qr"
    );


const closeQrButton =
    document.getElementById(
        "close-qr-btn"
    );


function closeAttendanceQrModal() {

    if (attendanceQrModal) {

        attendanceQrModal.classList.add(
            "hidden"
        );
    }
}


if (closeAttendanceQr) {

    closeAttendanceQr.addEventListener(
        "click",
        closeAttendanceQrModal
    );
}


if (closeQrButton) {

    closeQrButton.addEventListener(
        "click",
        closeAttendanceQrModal
    );
}


// ========================================
// STOP ATTENDANCE SESSION
// ========================================

async function stopAttendanceSession(
    sessionId
) {

    if (!sessionId) {

        showToast(
            "No active attendance session.",
            "error"
        );

        return;
    }


    const confirmed =
        confirm(
            "Stop this attendance session? Students will no longer be able to mark attendance."
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `http://127.0.0.1:8000/attendance/sessions/${sessionId}/stop`,
                {
                    method: "POST"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to stop attendance session"
            );
        }


        console.log(
            "Attendance session stopped:",
            data
        );


        activeAttendanceSessionId =
            null;


        closeAttendanceQrModal();


        /*
         * Reload classes.
         *
         * The active class will now show
         * Start Attendance again.
         */

        await loadTeacherTodayClasses();


        showToast(
            "Attendance session stopped successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Stop attendance error:",
            error
        );


        showToast(
            error.message ||
            "Unable to stop attendance session.",
            "error"
        );
    }
}


// ========================================
// STOP SESSION FROM QR MODAL
// ========================================

const stopAttendanceButton =
    document.getElementById(
        "stop-attendance-btn"
    );


if (stopAttendanceButton) {

    stopAttendanceButton.addEventListener(
        "click",
        function () {

            stopAttendanceSession(
                activeAttendanceSessionId
            );
        }
    );
}


// ========================================
// CREATE CLASS
// ========================================

const createClassButton =
    document.getElementById(
        "create-class-btn"
    );


const createClassModal =
    document.getElementById(
        "create-class-modal"
    );


const closeCreateClass =
    document.getElementById(
        "close-create-class"
    );


const cancelCreateClass =
    document.getElementById(
        "cancel-create-class"
    );


const createClassForm =
    document.getElementById(
        "create-class-form"
    );


const createClassError =
    document.getElementById(
        "create-class-error"
    );


if (createClassButton) {

    createClassButton.addEventListener(
        "click",
        function () {

            createClassModal.classList.remove(
                "hidden"
            );
        }
    );
}


function closeCreateClassModal() {

    createClassModal.classList.add(
        "hidden"
    );


    createClassForm.reset();


    createClassError.textContent = "";
}


if (closeCreateClass) {

    closeCreateClass.addEventListener(
        "click",
        closeCreateClassModal
    );
}


if (cancelCreateClass) {

    cancelCreateClass.addEventListener(
        "click",
        closeCreateClassModal
    );
}


if (createClassForm) {

    createClassForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            createClassError.textContent =
                "";


            const teacherData =
                sessionStorage.getItem(
                    "teacher"
                );


            if (!teacherData) {

                createClassError.textContent =
                    "Please log in again.";

                return;
            }


            const teacher =
                JSON.parse(
                    teacherData
                );


            const classData = {

                name:
                    document.getElementById(
                        "class-name"
                    ).value.trim(),


                subject:
                    document.getElementById(
                        "class-subject"
                    ).value.trim(),


                teacher_id:
                    teacher.teacher_id,


                day_of_week:
                    document.getElementById(
                        "class-day"
                    ).value,


                start_time:
                    document.getElementById(
                        "class-start-time"
                    ).value + ":00",


                end_time:
                    document.getElementById(
                        "class-end-time"
                    ).value + ":00"
            };


            const saveButton =
                document.getElementById(
                    "save-class-btn"
                );


            saveButton.disabled = true;

            saveButton.textContent =
                "Creating...";


            try {

                const response =
                    await fetch(
                        "http://127.0.0.1:8000/classes/",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    classData
                                )
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Failed to create class"
                    );
                }


                showToast(
                    "Class created successfully!",
                    "success"
                );


                closeCreateClassModal();


                await loadTeacherClasses();


            } catch (error) {

                console.error(
                    "Create class error:",
                    error
                );


                createClassError.textContent =
                    typeof error.message === "string"
                        ? error.message
                        : "Failed to create class.";
            }


            saveButton.disabled = false;


            saveButton.textContent =
                "Create Class";
        }
    );
}


// ========================================
// TEACHER LOGOUT
// ========================================

const teacherLogout =
    document.querySelector(
        ".logout-btn"
    );


if (teacherLogout) {

    teacherLogout.addEventListener(
        "click",
        function () {

            sessionStorage.removeItem(
                "teacher"
            );


            window.location.href =
                "teacher-login.html";
        }
    );
}


// ========================================
// STUDENT DASHBOARD AUTH CHECK
// ========================================

const studentName =
    document.getElementById(
        "student-name"
    );

if (studentName) {

    const studentData =
        sessionStorage.getItem("student");

    if (!studentData) {

        window.location.href =
            "student-login.html";

    } else {

        const student =
            JSON.parse(studentData);

        studentName.textContent =
            student.name;

        // M6.12 - LOAD ATTENDANCE
        loadStudentAttendance(
            student.student_id
        );
    }
}



// ========================================
// M6.12 - STUDENT ATTENDANCE DASHBOARD
// ========================================

async function loadStudentAttendance(
    studentId
) {

    const attendancePercentage =
        document.getElementById(
            "attendance-percentage"
        );


    const classCount =
        document.getElementById(
            "class-count"
        );


    const presentCount =
        document.getElementById(
            "present-count"
        );


    const absentCount =
        document.getElementById(
            "absent-count"
        );


    const recentAttendance =
        document.getElementById(
            "recent-attendance"
        );


    try {

        const response =
            await fetch(
                `http://127.0.0.1:8000/attendance/student/${studentId}`
            );


        const attendanceRecords =
            await response.json();


        if (!response.ok) {

            throw new Error(
                attendanceRecords.detail ||
                "Failed to load attendance"
            );
        }


        // ========================================
        // M6.14 - ATTENDANCE SUMMARY
        // ========================================

        const summaryResponse =
            await fetch(
                `http://127.0.0.1:8000/attendance/student/${studentId}/summary`
            );

        const summary =
            await summaryResponse.json();

        if (!summaryResponse.ok) {
            throw new Error(
                summary.detail ||
                "Failed to load attendance summary"
            );
        }

        if (classCount) {
            classCount.textContent = summary.class_count;
        }

        if (presentCount) {
            presentCount.textContent = summary.present;
        }

        if (absentCount) {
            absentCount.textContent = summary.absent;
        }

        if (attendancePercentage) {
            attendancePercentage.textContent =
                summary.total_sessions > 0
                    ? `${summary.percentage}%`
                    : "--";
        }


        // ========================================
        // RECENT ATTENDANCE
        // ========================================

        if (!recentAttendance) {
            return;
        }


        if (attendanceRecords.length === 0) {

            recentAttendance.innerHTML = `
                <p>No attendance records yet.</p>
            `;

            return;
        }


        /*
         * API already returns records ordered
         * from newest to oldest.
         *
         * Display only the latest 5 records.
         */

        const recentRecords =
            attendanceRecords.slice(0, 5);


        recentAttendance.innerHTML =
            recentRecords.map(
                function (record) {

                    const markedDate =
                        parseUtcDate(
                            record.marked_at
                        );


                    const formattedDate =
                        markedDate.toLocaleDateString(
                            "en-IN",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            }
                        );


                    const formattedTime =
                        markedDate.toLocaleTimeString(
                            "en-IN",
                            {
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        );


                    return `
                        <div
                            class="attendance-record student-attendance-record"
                            data-session-id="${record.session_id}"
                            style="cursor: pointer;"
                        >

                            <div>

                                <h3>
                                    ${record.class_name}
                                </h3>

                                <p>
                                    ${record.subject}
                                </p>

                            </div>


                            <div>

                                <span>
                                    ${record.status}
                                </span>


                                <small>
                                    ${formattedDate}
                                    ·
                                    ${formattedTime}
                                </small>

                            </div>

                        </div>
                    `;
                }
            ).join("");



        // ========================================
        // M8.8 - STUDENT ATTENDANCE CLICK
        // ========================================

        const studentAttendanceRecords =
            recentAttendance.querySelectorAll(
                ".student-attendance-record"
            );


        studentAttendanceRecords.forEach(
            function (recordElement) {

                recordElement.addEventListener(
                    "click",
                    function () {

                        const sessionId =
                            recordElement.dataset.sessionId;


                        if (!sessionId) {

                            showToast(
                                "Attendance session information is unavailable.",
                                "error"
                            );

                            return;

                        }


                        loadStudentSessionDetails(
                            sessionId
                        );

                    }
                );

            }
        );



    } catch (error) {

        console.error(
            "Student attendance loading error:",
            error
        );


        if (recentAttendance) {

            recentAttendance.innerHTML = `
                <p>Unable to load attendance records.</p>
            `;
        }
    }
}



// ========================================
// M8.8 - STUDENT SESSION DETAILS
// ========================================

async function loadStudentSessionDetails(
    sessionId
) {

    if (!sessionId) {
        return;
    }


    const studentData =
        sessionStorage.getItem(
            "student"
        );


    if (!studentData) {

        showToast(
            "Please log in again.",
            "error"
        );

        return;
    }


    const student =
        JSON.parse(
            studentData
        );


    try {

        const response =
            await fetch(
                `http://127.0.0.1:8000/attendance/session/${sessionId}`
            );


        const session =
            await response.json();


        if (!response.ok) {

            throw new Error(
                session.detail ||
                "Failed to load session details"
            );

        }


        // ========================================
        // FIND CURRENT STUDENT
        // ========================================

        const studentRecord =
            (session.students || []).find(
                function (item) {

                    return (
                        item.student_id ===
                        student.student_id
                    );

                }
            );


        if (!studentRecord) {

            showToast(
                "Your attendance record was not found.",
                "error"
            );

            return;
        }


        // ========================================
        // FORMAT SESSION TIME
        // ========================================

        const startDate =
            parseUtcDate(
                session.start_time
            );


        const endDate =
            parseUtcDate(
                session.end_time
            );


        let sessionTime =
            "--";


        if (
            startDate &&
            endDate
        ) {

            const startTime =
                startDate.toLocaleTimeString(
                    "en-IN",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );


            const endTime =
                endDate.toLocaleTimeString(
                    "en-IN",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );


            sessionTime =
                `${startTime} – ${endTime}`;
        }


        // ========================================
        // FORMAT MARKED TIME
        // ========================================

        let markedTime =
            "--";


        if (studentRecord.marked_at) {

            const markedDate =
                parseUtcDate(
                    studentRecord.marked_at
                );


            if (markedDate) {

                markedTime =
                    markedDate.toLocaleTimeString(
                        "en-IN",
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    );

            }
        }


        // ========================================
        // CREATE MODAL
        // ========================================

        const modal =
            document.createElement(
                "div"
            );


        modal.id =
            "student-session-details-modal";


        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(15, 23, 42, 0.45);
        `;


        modal.innerHTML = `

            <div
                style="
                    width: min(620px, 100%);
                    max-height: 85vh;
                    overflow-y: auto;
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 28px;
                    box-shadow:
                        0 20px 60px
                        rgba(15, 23, 42, 0.20);
                "
            >

                <div
                    style="
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 20px;
                        margin-bottom: 24px;
                    "
                >

                    <div>

                        <p
                            style="
                                margin: 0 0 6px;
                                color: #2563eb;
                                font-size: 12px;
                                font-weight: 700;
                                letter-spacing: 0.12em;
                            "
                        >
                            ATTENDANCE
                        </p>


                        <h2
                            style="
                                margin: 0 0 6px;
                                color: #0f172a;
                                font-size: 24px;
                            "
                        >
                            ${session.subject}
                        </h2>


                        <p
                            style="
                                margin: 0;
                                color: #64748b;
                                font-size: 14px;
                            "
                        >
                            ${session.class_name}
                            · Session #${sessionId}
                        </p>

                    </div>


                    <button
                        type="button"
                        id="close-student-session-details"
                        style="
                            width: 36px;
                            height: 36px;
                            border: none;
                            border-radius: 10px;
                            background: #f1f5f9;
                            color: #475569;
                            font-size: 18px;
                            cursor: pointer;
                        "
                    >
                        ×
                    </button>

                </div>


                <div
                    style="
                        display: grid;
                        grid-template-columns:
                            repeat(3, 1fr);
                        gap: 12px;
                        margin-bottom: 24px;
                    "
                >

                    <div
                        style="
                            padding: 16px;
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                        "
                    >

                        <div
                            style="
                                color: #64748b;
                                font-size: 12px;
                                margin-bottom: 6px;
                            "
                        >
                            Status
                        </div>


                        <strong
                            style="
                                color: ${
                                    studentRecord.status === "present"
                                        ? "#16a34a"
                                        : "#64748b"
                                };
                                font-size: 18px;
                                text-transform: capitalize;
                            "
                        >
                            ${studentRecord.status}
                        </strong>

                    </div>


                    <div
                        style="
                            padding: 16px;
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                        "
                    >

                        <div
                            style="
                                color: #64748b;
                                font-size: 12px;
                                margin-bottom: 6px;
                            "
                        >
                            Session Time
                        </div>


                        <strong
                            style="
                                color: #0f172a;
                                font-size: 15px;
                            "
                        >
                            ${sessionTime}
                        </strong>

                    </div>


                    <div
                        style="
                            padding: 16px;
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                        "
                    >

                        <div
                            style="
                                color: #64748b;
                                font-size: 12px;
                                margin-bottom: 6px;
                            "
                        >
                            Marked At
                        </div>


                        <strong
                            style="
                                color: #0f172a;
                                font-size: 15px;
                            "
                        >
                            ${markedTime}
                        </strong>

                    </div>

                </div>


                <div
                    style="
                        padding-top: 18px;
                        border-top: 1px solid #e2e8f0;
                    "
                >

                    <p
                        style="
                            margin: 0 0 4px;
                            color: #0f172a;
                            font-weight: 600;
                        "
                    >
                        ${student.name}
                    </p>


                    <p
                        style="
                            margin: 0;
                            color: #64748b;
                            font-size: 13px;
                        "
                    >
                        ${student.student_id}
                    </p>

                </div>

            </div>
        `;


        document.body.appendChild(
            modal
        );


        // ========================================
        // CLOSE BUTTON
        // ========================================

        const closeButton =
            document.getElementById(
                "close-student-session-details"
            );


        closeButton.addEventListener(
            "click",
            function () {

                modal.remove();

            }
        );


        // ========================================
        // CLOSE WHEN CLICKING OUTSIDE
        // ========================================

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    modal.remove();

                }

            }
        );


    } catch (error) {

        console.error(
            "Student session details error:",
            error
        );


        const errorMessage =
            error instanceof Error
                ? error.message
                : (
                    error?.detail ||
                    error?.message ||
                    "Unable to load session details."
                );


        showToast(
            errorMessage,
            "error"
        );

    }
}



// ========================================
// STUDENT LOGOUT
// ========================================

const studentLogout =
    document.getElementById(
        "student-logout"
    );


if (studentLogout) {

    studentLogout.addEventListener(
        "click",
        function () {

            sessionStorage.removeItem(
                "student"
            );


            window.location.href =
                "student-login.html";
        }
    );
}


// ========================================
// M7.5.2 - STUDENT TIMETABLE
// ========================================

const studentTimetable =
    document.getElementById(
        "student-timetable"
    );


async function loadStudentTimetable(
    classId
) {

    if (!studentTimetable) {
        return;
    }


    if (!classId) {

        studentTimetable.innerHTML = `
            <p>
                No class information is available.
            </p>
        `;

        return;

    }


    try {

        const response =
            await fetch(
                `http://127.0.0.1:8000/schedules/class/${classId}`
            );


        const timetable =
            await response.json();


        if (!response.ok) {

            throw new Error(
                timetable.detail ||
                "Failed to load timetable"
            );

        }


        if (timetable.length === 0) {

            studentTimetable.innerHTML = `
                <p>
                    No timetable entries found.
                </p>
            `;

            return;

        }


        // ========================================
        // DAY ORDER
        // ========================================

        const dayOrder = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
        ];


        // ========================================
        // SORT TIMETABLE
        // ========================================

        timetable.sort(
            function (a, b) {

                const dayDifference =
                    dayOrder.indexOf(
                        a.day_of_week
                    ) -
                    dayOrder.indexOf(
                        b.day_of_week
                    );


                if (dayDifference !== 0) {

                    return dayDifference;

                }


                return a.start_time.localeCompare(
                    b.start_time
                );

            }
        );


        // ========================================
        // FORMAT TIME
        // ========================================

        function formatTime(timeString) {

            const parts =
                timeString.split(":");


            let hour =
                Number(parts[0]);


            const minute =
                parts[1];


            const period =
                hour >= 12
                    ? "PM"
                    : "AM";


            hour =
                hour % 12 || 12;


            return `${hour}:${minute} ${period}`;

        }


        // ========================================
        // GROUP BY DAY
        // ========================================

        const groupedByDay = {};


        timetable.forEach(
            function (entry) {

                if (
                    !groupedByDay[
                        entry.day_of_week
                    ]
                ) {

                    groupedByDay[
                        entry.day_of_week
                    ] = [];

                }


                groupedByDay[
                    entry.day_of_week
                ].push(entry);

            }
        );


        // ========================================
        // RENDER TIMETABLE
        // ========================================

        studentTimetable.innerHTML = "";


        dayOrder.forEach(
            function (day) {

                const entries =
                    groupedByDay[day];


                if (!entries) {

                    return;

                }


                const dayContainer =
                    document.createElement(
                        "div"
                    );


                dayContainer.className =
                    "timetable-day";


                dayContainer.innerHTML = `
                    <div class="timetable-day-header">
                        ${day}
                    </div>
                `;


                entries.forEach(
                    function (entry) {

                        const timetableEntry =
                            document.createElement(
                                "div"
                            );


                        timetableEntry.className =
                            "timetable-entry";


                        timetableEntry.innerHTML = `
                            <div class="timetable-time">
                                ${formatTime(entry.start_time)}
                                –
                                ${formatTime(entry.end_time)}
                            </div>

                            <div>

                                <div class="timetable-subject">
                                    ${entry.subject}
                                </div>

                                <div class="timetable-batch">
                                    ${entry.batch}
                                    ${
                                        entry.faculty
                                            ? " · " + entry.faculty
                                            : ""
                                    }
                                </div>

                            </div>

                            <div class="timetable-room">
                                ${
                                    entry.room ||
                                    "Room not assigned"
                                }
                            </div>
                        `;


                        dayContainer.appendChild(
                            timetableEntry
                        );

                    }
                );


                studentTimetable.appendChild(
                    dayContainer
                );

            }
        );


    } catch (error) {

        console.error(
            "Student timetable error:",
            error
        );


        studentTimetable.innerHTML = `
            <p>
                Unable to load timetable.
            </p>
        `;

    }

}


// ========================================
// M7.5.3 - INITIALIZE STUDENT TIMETABLE
// ========================================

const studentTimetableData =
    sessionStorage.getItem("student");

if (studentTimetableData) {

    const student =
        JSON.parse(studentTimetableData);

    loadStudentTimetable(
        student.class_id
    );
}



// ========================================
// M7.5.4 - TODAY'S CLASSES FROM TIMETABLE
// ========================================

const studentClassList =
    document.getElementById(
        "student-class-list"
    );


// ========================================
// M7.7.1 - STUDENT LIVE SESSION POLLING
// ========================================

let studentTodayClassesInterval = null;


if (studentClassList) {

    const studentData =
        sessionStorage.getItem("student");


    if (studentData) {

        const student =
            JSON.parse(studentData);


        // Initial load
        loadStudentTodayClasses(
            student.class_id
        );


        // Check for live attendance every 5 seconds
        studentTodayClassesInterval =
            setInterval(
                function () {

                    loadStudentTodayClasses(
                        student.class_id
                    );

                },
                5000
            );

    }
}

// ========================================
// LOAD STUDENT TODAY'S CLASSES
// ========================================


async function loadStudentTodayClasses(
    classId
) {

    if (!classId) {
        studentClassList.innerHTML = `
            <p>
                No class information is available.
            </p>
        `;

        return;
    }


    try {

        const response =
            await fetch(
                `http://127.0.0.1:8000/schedules/class/${classId}`
            );


        const timetable =
            await response.json();


        if (!response.ok) {

            throw new Error(
                timetable.detail ||
                "Failed to load today's classes"
            );

        }


        // ========================================
        // GET CURRENT DAY
        // ========================================

        const today =
            new Date().toLocaleDateString(
                "en-US",
                {
                    weekday: "long"
                }
            );


        // ========================================
        // FILTER TODAY'S CLASSES
        // ========================================

        const todaysClasses =
            timetable.filter(
                function (entry) {

                    return (
                        entry.day_of_week ===
                        today
                    );

                }
            );


        // ========================================
        // NO CLASSES TODAY
        // ========================================

        if (todaysClasses.length === 0) {

            studentClassList.innerHTML = `
                <div class="empty-state">
                    <p>
                        No classes scheduled for today.
                    </p>
                </div>
            `;

            return;
        }


        // ========================================
        // SORT BY START TIME
        // ========================================

        todaysClasses.sort(
            function (a, b) {

                return a.start_time.localeCompare(
                    b.start_time
                );

            }
        );


        // ========================================
        // FORMAT TIME
        // ========================================

        function formatTime(timeString) {

            const parts =
                timeString.split(":");


            let hour =
                Number(parts[0]);


            const minute =
                parts[1];


            const period =
                hour >= 12
                    ? "PM"
                    : "AM";


            hour =
                hour % 12 || 12;


            return `${hour}:${minute} ${period}`;
        }


// ========================================
// M7.8 - CHECK ATTENDANCE STATUS
// ========================================

let activeSession = null;
let attendanceAlreadyMarked = false;

try {

    // ----------------------------------------
    // CHECK ACTIVE SESSION
    // ----------------------------------------

    const sessionResponse =
        await fetch(
            `http://127.0.0.1:8000/attendance/sessions/active/${classId}`
        );

    if (sessionResponse.ok) {

        activeSession =
            await sessionResponse.json();

    }


    // ----------------------------------------
    // CHECK STUDENT ATTENDANCE RECORDS
    // ----------------------------------------

    if (activeSession) {

        const studentData =
            sessionStorage.getItem("student");


        if (studentData) {

            const student =
                JSON.parse(studentData);


            const attendanceResponse =
                await fetch(
                    `http://127.0.0.1:8000/attendance/student/${student.student_id}`
                );


            if (attendanceResponse.ok) {

                const attendanceRecords =
                    await attendanceResponse.json();


                attendanceAlreadyMarked =
                    attendanceRecords.some(
                        function (record) {

                            return (
                                record.session_id ===
                                activeSession.id
                            );

                        }
                    );

            }

        }

    }

} catch (error) {

    console.error(
        "Attendance status check error:",
        error
    );

}


        // ========================================
        // RENDER TODAY'S CLASSES
        // ========================================

        studentClassList.innerHTML = "";


        todaysClasses.forEach(
            function (entry) {

                const classCard =
                    document.createElement(
                        "div"
                    );


                classCard.className =
                    "student-class-card";


if (activeSession) {

    if (attendanceAlreadyMarked) {

        classCard.innerHTML = `
            <div>
                <h3>
                    ${entry.subject}
                </h3>

                <p>
                    ${entry.batch}
                </p>

                <span>
                    ${formatTime(entry.start_time)}
                    –
                    ${formatTime(entry.end_time)}
                </span>

                ${
                    entry.room
                        ? `
                            <span>
                                · ${entry.room}
                            </span>
                        `
                        : ""
                }

                <div
                    style="
                        margin-top: 8px;
                        color: #16a34a;
                        font-size: 14px;
                        font-weight: 600;
                    "
                >
                    ✓ Attendance Marked
                </div>
            </div>

            <button
                type="button"
                class="btn btn-secondary"
                disabled
            >
                Already Marked
            </button>
        `;

    } else {

        classCard.innerHTML = `
            <div>
                <h3>
                    ${entry.subject}
                </h3>

                <p>
                    ${entry.batch}
                </p>

                <span>
                    ${formatTime(entry.start_time)}
                    –
                    ${formatTime(entry.end_time)}
                </span>

                ${
                    entry.room
                        ? `
                            <span>
                                · ${entry.room}
                            </span>
                        `
                        : ""
                }

                <div
                    style="
                        margin-top: 8px;
                        color: #16a34a;
                        font-size: 14px;
                        font-weight: 600;
                    "
                >
                    ● Attendance Available
                </div>
            </div>

            <button
                type="button"
                class="btn btn-primary"
                onclick="window.location.href='attendance.html'"
            >
                Scan Attendance
            </button>
        `;

    }
}


                // ========================================
                // M7.7.1 - NO ACTIVE ATTENDANCE SESSION
                // ========================================

                else {

                    classCard.innerHTML = `
                        <div>
                            <h3>
                                ${entry.subject}
                            </h3>

                            <p>
                                ${entry.batch}
                            </p>

                            <span>
                                ${formatTime(entry.start_time)}
                                –
                                ${formatTime(entry.end_time)}
                            </span>

                            ${
                                entry.room
                                    ? `
                                        <span>
                                            · ${entry.room}
                                        </span>
                                    `
                                    : ""
                            }

                            <div
                                style="
                                    margin-top: 8px;
                                    color: #64748b;
                                    font-size: 14px;
                                    font-weight: 500;
                                "
                            >
                                Attendance not started
                            </div>
                        </div>

                        <button
                            type="button"
                            class="btn btn-primary"
                            disabled
                        >
                            Attendance Not Started
                        </button>
                    `;
                }


                studentClassList.appendChild(
                    classCard
                );

            }
        );


    } catch (error) {

        console.error(
            "Today's classes loading error:",
            error
        );


        studentClassList.innerHTML = `
            <p>
                Unable to load today's classes.
            </p>
        `;

    }
}




// ========================================
// STUDENT QR SCANNER
// M6.10 - SCAN CONFIRMATION
// ========================================

const qrReader =
    document.getElementById(
        "qr-reader"
    );


if (qrReader) {

    const studentData =
        sessionStorage.getItem(
            "student"
        );


    if (!studentData) {

        window.location.href =
            "student-login.html";


    } else {

        const student =
            JSON.parse(
                studentData
            );


        const scanner =
            new Html5Qrcode(
                "qr-reader"
            );


        // ========================================
        // PENDING QR TOKEN
        // ========================================

        /*
         * The scanned token is kept here until
         * the student confirms attendance.
         */

        let pendingQrToken = null;


        // ========================================
        // SHOW ATTENDANCE CONFIRMATION
        // ========================================

        function showAttendanceConfirmation(
            qrToken
        ) {

            pendingQrToken =
                qrToken;


            const scannerContainer =
                document.getElementById(
                    "qr-reader"
                );


            const statusElement =
                document.getElementById(
                    "scan-status"
                );


            if (scannerContainer) {

                scannerContainer.style.display =
                    "none";
            }


            if (statusElement) {

                statusElement.style.display =
                    "none";
            }


            let confirmationBox =
                document.getElementById(
                    "attendance-confirmation"
                );


            if (!confirmationBox) {

                confirmationBox =
                    document.createElement(
                        "div"
                    );


                confirmationBox.id =
                    "attendance-confirmation";


                confirmationBox.style.maxWidth =
                    "500px";


                confirmationBox.style.margin =
                    "0 auto 24px";


                confirmationBox.style.padding =
                    "24px";


                confirmationBox.style.border =
                    "1px solid #e2e8f0";


                confirmationBox.style.borderRadius =
                    "16px";


                confirmationBox.style.background =
                    "#ffffff";


                confirmationBox.style.textAlign =
                    "center";


                confirmationBox.innerHTML = `

                    <h3
                        style="
                            margin: 0 0 10px;
                            font-size: 20px;
                        "
                    >
                        Confirm Attendance
                    </h3>


                    <p
                        style="
                            margin: 0 0 20px;
                            color: #64748b;
                            line-height: 1.5;
                        "
                    >
                        Your attendance will be
                        recorded for this active session.
                    </p>


                    <div
                        style="
                            display: flex;
                            justify-content: center;
                            gap: 12px;
                        "
                    >

                        <button
                            type="button"
                            id="cancel-attendance"
                            class="btn btn-secondary"
                        >
                            Cancel
                        </button>


                        <button
                            type="button"
                            id="confirm-attendance"
                            class="btn btn-primary"
                        >
                            Confirm Attendance
                        </button>

                    </div>

                `;


                qrReader.parentNode.insertBefore(
                    confirmationBox,
                    qrReader
                );
            }


            confirmationBox.style.display =
                "block";


            const cancelButton =
                document.getElementById(
                    "cancel-attendance"
                );


            const confirmButton =
                document.getElementById(
                    "confirm-attendance"
                );


            /*
             * Clone buttons so old event
             * listeners cannot accumulate.
             */

            const newCancelButton =
                cancelButton.cloneNode(true);


            const newConfirmButton =
                confirmButton.cloneNode(true);


            cancelButton.replaceWith(
                newCancelButton
            );


            confirmButton.replaceWith(
                newConfirmButton
            );


            // ========================================
            // CANCEL CONFIRMATION
            // ========================================

            newCancelButton.addEventListener(
                "click",
                function () {

                    pendingQrToken =
                        null;


                    confirmationBox.style.display =
                        "none";


                    if (scannerContainer) {

                        scannerContainer.style.display =
                            "block";
                    }


                    if (statusElement) {

                        statusElement.style.display =
                            "block";


                        statusElement.textContent =
                            "Point your camera at the attendance QR code.";
                    }


                    startScanner();
                }
            );


            // ========================================
            // CONFIRM ATTENDANCE
            // ========================================

            newConfirmButton.addEventListener(
                "click",
                async function () {

                    newConfirmButton.disabled =
                        true;


                    newConfirmButton.textContent =
                        "Confirming...";


                    await markAttendance(
                        student.student_id,
                        pendingQrToken
                    );
                }
            );
        }


        // ========================================
        // START SCANNER
        // ========================================

        function startScanner() {

            scanner.start(
                {
                    facingMode:
                        "environment"
                },

                {
                    fps: 10,

                    qrbox: {
                        width: 250,
                        height: 250
                    }
                },

                onScanSuccess,

                onScanFailure

            ).catch(
                function (error) {

                    console.error(
                        "Camera error:",
                        error
                    );


                    const statusElement =
                        document.getElementById(
                            "scan-status"
                        );


                    if (statusElement) {

                        statusElement.textContent =
                            "Unable to access the camera. Please allow camera permission.";
                    }
                }
            );
        }


        // ========================================
        // QR SCAN SUCCESS
        // ========================================

        function onScanSuccess(
            decodedText
        ) {

            console.log(
                "QR scanned:",
                decodedText
            );


            scanner.stop()
                .then(
                    function () {

                        showAttendanceConfirmation(
                            decodedText
                        );
                    }
                )
                .catch(
                    function (error) {

                        console.error(
                            "Scanner stop error:",
                            error
                        );
                    }
                );
        }


        // ========================================
        // QR SCAN FAILURE
        // ========================================

        function onScanFailure(
            error
        ) {

            // Ignore continuous scanning errors.
        }


        // ========================================
        // MARK ATTENDANCE
        // ========================================

        async function markAttendance(
            studentId,
            qrToken
        ) {

            const statusElement =
                document.getElementById(
                    "scan-status"
                );


            if (statusElement) {

                statusElement.style.display =
                    "block";


                statusElement.textContent =
                    "Verifying attendance...";
            }


            try {

                const response =
                    await fetch(
                        "http://127.0.0.1:8000/attendance/mark",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    student_id:
                                        studentId,

                                    qr_token:
                                        qrToken
                                })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Unable to mark attendance"
                    );
                }


                pendingQrToken =
                    null;


                const confirmationBox =
                    document.getElementById(
                        "attendance-confirmation"
                    );


                if (confirmationBox) {

                    confirmationBox.style.display =
                        "none";
                }


                const scannerContainer =
                    document.getElementById(
                        "qr-reader"
                    );


                if (scannerContainer) {

                    scannerContainer.style.display =
                        "none";
                }


                if (statusElement) {

                    statusElement.style.display =
                        "block";


                    statusElement.textContent =
                        "✓ Attendance marked successfully.";
                }


                console.log(
                    "Attendance result:",
                    data
                );


            } catch (error) {

                console.error(
                    "Attendance error:",
                    error
                );


                pendingQrToken =
                    null;


                const confirmationBox =
                    document.getElementById(
                        "attendance-confirmation"
                    );


                if (confirmationBox) {

                    confirmationBox.style.display =
                        "none";
                }


                const scannerContainer =
                    document.getElementById(
                        "qr-reader"
                    );


                if (scannerContainer) {

                    scannerContainer.style.display =
                        "block";
                }


                if (statusElement) {

                    statusElement.style.display =
                        "block";


                    statusElement.textContent =
                        error.message;
                }


                /*
                 * Restart scanner so the student
                 * can try again after an invalid,
                 * expired, or already-used QR.
                 */

                startScanner();
            }
        }


        // ========================================
        // INITIALIZE SCANNER
        // ========================================

        startScanner();
    }
}


// ========================================
// BACK TO STUDENT DASHBOARD
// ========================================

const backDashboard =
    document.getElementById(
        "back-dashboard"
    );


if (backDashboard) {

    backDashboard.addEventListener(
        "click",
        function () {

            window.location.href =
                "student-dashboard.html";
        }
    );
}