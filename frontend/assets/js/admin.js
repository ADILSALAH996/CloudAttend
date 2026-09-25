// ========================================
// CLOUDATTEND ADMIN PORTAL
// ========================================

(function () {

    const API_BASE =
        "http://127.0.0.1:8000";

    const ADMIN_LOGIN_PAGE =
        "admin-login.html";


    // ========================================
    // HELPERS
    // ========================================

    function isAdminLoggedIn() {

        return Boolean(
            sessionStorage.getItem("admin")
        );

    }


    function requireAdmin() {

        if (!isAdminLoggedIn()) {

            window.location.href =
                ADMIN_LOGIN_PAGE;

            return false;

        }

        return true;

    }


    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function parseUtcDate(timestamp) {

        if (!timestamp) {
            return null;
        }

        const normalized =
            timestamp.endsWith("Z")
                ? timestamp
                : timestamp + "Z";

        return new Date(normalized);

    }


    function formatDate(timestamp) {

        const date =
            parseUtcDate(timestamp);

        if (!date) {
            return "--";
        }

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    function formatTime(timestamp) {

        const date =
            parseUtcDate(timestamp);

        if (!date) {
            return "--";
        }

        return date.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    function formatTimeRange(
        startTime,
        endTime
    ) {

        function formatTimeValue(
            timeString
        ) {

            if (!timeString) {
                return "--";
            }

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


        return `${formatTimeValue(startTime)} – ${formatTimeValue(endTime)}`;

    }


    function statusBadge(
        status
    ) {

        const normalized =
            String(status || "")
                .toLowerCase();


        let label =
            status || "Active";


        if (
            normalized ===
            "stopped"
        ) {

            label = "Stopped";

        }


        if (
            normalized ===
            "active"
        ) {

            label = "Active";

        }


        if (
            normalized ===
            "completed"
        ) {

            label = "Completed";

        }


        return `
            <span class="admin-badge">
                ${escapeHtml(label)}
            </span>
        `;

    }


    async function fetchJson(
        endpoint
    ) {

        const response =
            await fetch(
                `${API_BASE}${endpoint}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                `Request failed: ${response.status}`
            );

        }


        return data;

    }


    // ========================================
    // LOGOUT
    // ========================================

    function setupLogout() {

        const button =
            document.getElementById(
                "admin-logout"
            );


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            function () {

                sessionStorage.removeItem(
                    "admin"
                );


                window.location.href =
                    ADMIN_LOGIN_PAGE;

            }
        );

    }


    // ========================================
    // ACTIVE NAVIGATION
    // ========================================

    function setupActiveNav() {

        const currentPage =
            window.location.pathname
                .split("/")
                .pop();


        document
            .querySelectorAll(
                ".admin-nav a"
            )
            .forEach(
                function (link) {

                    const target =
                        link.getAttribute(
                            "href"
                        );


                    if (
                        target ===
                        currentPage
                    ) {

                        link.classList.add(
                            "active"
                        );

                    }

                }
            );

    }


    // ========================================
    // M9.5 - OVERVIEW
    // ========================================

    async function loadAdminOverview() {

        const students =
            document.getElementById(
                "admin-total-students"
            );

        const teachers =
            document.getElementById(
                "admin-total-teachers"
            );

        const classes =
            document.getElementById(
                "admin-total-classes"
            );

        const sessions =
            document.getElementById(
                "admin-attendance-sessions"
            );


        if (
            !students &&
            !teachers &&
            !classes &&
            !sessions
        ) {

            return;

        }


        try {

            const data =
                await fetchJson(
                    "/admin/overview"
                );


            if (students) {
                students.textContent =
                    data.total_students;
            }


            if (teachers) {
                teachers.textContent =
                    data.total_teachers;
            }


            if (classes) {
                classes.textContent =
                    data.total_classes;
            }


            if (sessions) {
                sessions.textContent =
                    data.total_attendance_sessions;
            }


        } catch (error) {

            console.error(
                "Admin overview error:",
                error
            );

        }

    }


    // ========================================
    // M9.7 - TEACHERS
    // ========================================

    async function loadAdminTeachers() {

        const table =
            document.getElementById(
                "admin-teachers-table"
            );


        if (!table) {
            return;
        }


        try {

            const teachers =
                await fetchJson(
                    "/admin/teachers"
                );


            if (
                !Array.isArray(teachers) ||
                teachers.length === 0
            ) {

                table.innerHTML = `
                    <tr>
                        <td colspan="5">
                            No teachers found.
                        </td>
                    </tr>
                `;

                return;

            }


            table.innerHTML =
                teachers.map(
                    function (teacher) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        teacher.id
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            teacher.name
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        teacher.email
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        teacher.faculty ||
                                        "Not assigned"
                                    )}
                                </td>

                                <td>
                                    ${statusBadge(
                                        "Active"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                ).join("");


        } catch (error) {

            console.error(
                "Admin teachers error:",
                error
            );


            table.innerHTML = `
                <tr>
                    <td colspan="5">
                        Unable to load teachers.
                    </td>
                </tr>
            `;

        }

    }


    // ========================================
    // M9.9 - STUDENTS
    // ========================================

    async function loadAdminStudents() {

        const table =
            document.getElementById(
                "admin-students-table"
            );


        if (!table) {
            return;
        }


        try {

            const students =
                await fetchJson(
                    "/admin/students"
                );


            if (
                !Array.isArray(students) ||
                students.length === 0
            ) {

                table.innerHTML = `
                    <tr>
                        <td colspan="5">
                            No students found.
                        </td>
                    </tr>
                `;

                return;

            }


            table.innerHTML =
                students.map(
                    function (student) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        student.student_id
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            student.name
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        student.email
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        student.class_name
                                    )}
                                </td>

                                <td>
                                    ${statusBadge(
                                        "Active"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                ).join("");


        } catch (error) {

            console.error(
                "Admin students error:",
                error
            );


            table.innerHTML = `
                <tr>
                    <td colspan="5">
                        Unable to load students.
                    </td>
                </tr>
            `;

        }

    }


    // ========================================
    // M9.11 - BATCHES
    // ========================================

    async function loadAdminBatches() {

        const table =
            document.getElementById(
                "admin-batches-table"
            );


        if (!table) {
            return;
        }


        try {

            const batches =
                await fetchJson(
                    "/admin/batches"
                );


            if (
                !Array.isArray(batches) ||
                batches.length === 0
            ) {

                table.innerHTML = `
                    <tr>
                        <td colspan="3">
                            No batches found.
                        </td>
                    </tr>
                `;

                return;

            }


            table.innerHTML =
                batches.map(
                    function (batch) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        batch.id
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            batch.name
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${statusBadge(
                                        "Active"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                ).join("");


        } catch (error) {

            console.error(
                "Admin batches error:",
                error
            );


            table.innerHTML = `
                <tr>
                    <td colspan="3">
                        Unable to load batches.
                    </td>
                </tr>
            `;

        }

    }


    // ========================================
    // M9.12 - CLASSES
    // ========================================

    async function loadAdminClasses() {

        const table =
            document.getElementById(
                "admin-classes-table"
            );


        if (!table) {
            return;
        }


        try {

            const classes =
                await fetchJson(
                    "/admin/classes"
                );


            if (
                !Array.isArray(classes) ||
                classes.length === 0
            ) {

                table.innerHTML = `
                    <tr>
                        <td colspan="6">
                            No classes found.
                        </td>
                    </tr>
                `;

                return;

            }


            table.innerHTML =
                classes.map(
                    function (classItem) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        classItem.id
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            classItem.name
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        classItem.subject
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        classItem.teacher ||
                                        "Not assigned"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        classItem.student_count
                                    )}
                                </td>

                                <td>
                                    ${statusBadge(
                                        "Active"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                ).join("");


        } catch (error) {

            console.error(
                "Admin classes error:",
                error
            );


            table.innerHTML = `
                <tr>
                    <td colspan="6">
                        Unable to load classes.
                    </td>
                </tr>
            `;

        }

    }


    // ========================================
    // M9.13 - SUBJECTS
    // ========================================

    async function loadAdminSubjects() {

        const table =
            document.getElementById(
                "admin-subjects-table"
            );


        if (!table) {
            return;
        }


        try {

            const subjects =
                await fetchJson(
                    "/admin/subjects"
                );


            if (
                !Array.isArray(subjects) ||
                subjects.length === 0
            ) {

                table.innerHTML = `
                    <tr>
                        <td colspan="2">
                            No subjects found.
                        </td>
                    </tr>
                `;

                return;

            }


            table.innerHTML =
                subjects.map(
                    function (subject) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        subject.id
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            subject.name
                                        )}
                                    </strong>
                                </td>

                            </tr>
                        `;

                    }
                ).join("");


        } catch (error) {

            console.error(
                "Admin subjects error:",
                error
            );


            table.innerHTML = `
                <tr>
                    <td colspan="2">
                        Unable to load subjects.
                    </td>
                </tr>
            `;

        }

    }


    // ========================================
    // M9.14 - TIMETABLE
    // ========================================

    async function loadAdminTimetable() {

        const table =
            document.getElementById(
                "admin-timetable-table"
            );


        if (!table) {
            return;
        }


        try {

            const timetable =
                await fetchJson(
                    "/admin/timetable"
                );


            if (
                !Array.isArray(timetable) ||
                timetable.length === 0
            ) {

                table.innerHTML = `
                    <tr>
                        <td colspan="6">
                            No timetable entries found.
                        </td>
                    </tr>
                `;

                return;

            }


            table.innerHTML =
                timetable.map(
                    function (entry) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        entry.day_of_week
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        formatTimeRange(
                                            entry.start_time,
                                            entry.end_time
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        entry.batch
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            entry.subject
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        entry.faculty ||
                                        "Not assigned"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        entry.room ||
                                        "--"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                ).join("");


        } catch (error) {

            console.error(
                "Admin timetable error:",
                error
            );


            table.innerHTML = `
                <tr>
                    <td colspan="6">
                        Unable to load timetable.
                    </td>
                </tr>
            `;

        }

    }


    // ========================================
    // M9.15 - ATTENDANCE
    // ========================================

    async function loadAdminAttendance() {

        const table =
            document.getElementById(
                "admin-attendance-table"
            );


        if (!table) {
            return;
        }


        try {

            const sessions =
                await fetchJson(
                    "/admin/attendance"
                );


            if (
                !Array.isArray(sessions) ||
                sessions.length === 0
            ) {

                table.innerHTML = `
                    <tr>
                        <td colspan="7">
                            No attendance sessions found.
                        </td>
                    </tr>
                `;

                return;

            }


            table.innerHTML =
                sessions.map(
                    function (session) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        session.session_id
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            session.class_name
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        session.subject
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        session.present
                                    )}
                                    /
                                    ${escapeHtml(
                                        session.total_students
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        session.attendance_percentage
                                    )}%
                                </td>

                                <td>
                                    ${statusBadge(
                                        session.status
                                    )}
                                </td>

                                <td>
                                    <small>
                                        ${formatDate(
                                            session.start_time
                                        )}
                                        <br>
                                        ${formatTime(
                                            session.start_time
                                        )}
                                    </small>
                                </td>

                            </tr>
                        `;

                    }
                ).join("");


        } catch (error) {

            console.error(
                "Admin attendance error:",
                error
            );


            table.innerHTML = `
                <tr>
                    <td colspan="7">
                        Unable to load attendance.
                    </td>
                </tr>
            `;

        }

    }


    // ========================================
    // M9.16 - REPORTS
    // ========================================

    async function loadAdminReports() {

        const table =
            document.getElementById(
                "admin-reports-table"
            );


        const overallAttendance =
            document.getElementById(
                "admin-overall-attendance"
            );


        const activeStudents =
            document.getElementById(
                "admin-active-students"
            );


        const totalSessions =
            document.getElementById(
                "admin-total-sessions"
            );


        if (
            !table &&
            !overallAttendance &&
            !activeStudents &&
            !totalSessions
        ) {

            return;

        }


        try {

            const [
                reports,
                overview
            ] =
                await Promise.all([
                    fetchJson(
                        "/admin/reports"
                    ),
                    fetchJson(
                        "/admin/overview"
                    )
                ]);


            // ========================================
            // REPORT SUMMARY
            // ========================================

            let totalPossible = 0;

            let totalPresent = 0;


            reports.forEach(
                function (report) {

                    totalPossible +=
                        (
                            Number(
                                report.students
                            ) *
                            Number(
                                report.sessions
                            )
                        );


                    totalPresent +=
                        Number(
                            report.present_records
                        );

                }
            );


            const percentage =
                totalPossible > 0
                    ? (
                        totalPresent /
                        totalPossible
                    ) * 100
                    : 0;


            if (overallAttendance) {

                overallAttendance.textContent =
                    `${percentage.toFixed(1)}%`;

            }


            if (activeStudents) {

                activeStudents.textContent =
                    overview.total_students;

            }


            if (totalSessions) {

                totalSessions.textContent =
                    overview.total_attendance_sessions;

            }


            // ========================================
            // CLASS REPORT TABLE
            // ========================================

            if (!table) {
                return;
            }


            if (
                !Array.isArray(reports) ||
                reports.length === 0
            ) {

                table.innerHTML = `
                    <tr>
                        <td colspan="7">
                            No reports available.
                        </td>
                    </tr>
                `;

                return;

            }


            table.innerHTML =
                reports.map(
                    function (report) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        report.class_id
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            report.class_name
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        report.subject
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        report.students
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        report.sessions
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        report.present_records
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        report.attendance_percentage
                                    )}%
                                </td>

                            </tr>
                        `;

                    }
                ).join("");


        } catch (error) {

            console.error(
                "Admin reports error:",
                error
            );


            if (table) {

                table.innerHTML = `
                    <tr>
                        <td colspan="7">
                            Unable to load reports.
                        </td>
                    </tr>
                `;

            }

        }

    }


    // ========================================
    // START
    // ========================================

    if (!requireAdmin()) {

        return;

    }


    setupLogout();

    setupActiveNav();

    loadAdminOverview();

    loadAdminTeachers();

    loadAdminStudents();

    loadAdminBatches();

    loadAdminClasses();

    loadAdminSubjects();

    loadAdminTimetable();

    loadAdminAttendance();

    loadAdminReports();

})();