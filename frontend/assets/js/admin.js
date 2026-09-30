(function () {

    const API_BASE = "http://127.0.0.1:8000";
    const ADMIN_LOGIN_PAGE = "admin-login.html";

    function isAdminLoggedIn() {
        return Boolean(sessionStorage.getItem("admin"));
    }

    function requireAdmin() {
        if (!isAdminLoggedIn()) {
            window.location.href = ADMIN_LOGIN_PAGE;
            return false;
        }
        return true;
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return "";
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function parseUtcDate(timestamp) {
        if (!timestamp) return null;
        const normalized =
            timestamp.endsWith("Z")
                ? timestamp
                : timestamp + "Z";
        return new Date(normalized);
    }

    function formatDate(timestamp) {
        const date = parseUtcDate(timestamp);
        if (!date) return "--";

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
        const date = parseUtcDate(timestamp);
        if (!date) return "--";

        return date.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    function formatTimeRange(startTime, endTime) {

        function formatValue(timeString) {

            if (!timeString) return "--";

            const parts =
                String(timeString).split(":");

            let hour =
                Number(parts[0]);

            const minute =
                parts[1] || "00";

            const period =
                hour >= 12
                    ? "PM"
                    : "AM";

            hour =
                hour % 12 || 12;

            return `${hour}:${minute} ${period}`;
        }

        return `${formatValue(startTime)} – ${formatValue(endTime)}`;
    }

    function statusBadge(status) {

        const value =
            String(status || "Active");

        return `
            <span class="admin-badge">
                ${escapeHtml(value)}
            </span>
        `;
    }

    async function fetchJson(
        endpoint,
        options = {}
    ) {

        const response =
            await fetch(
                `${API_BASE}${endpoint}`,
                options
            );

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {

            throw new Error(
                data.detail ||
                `Request failed: ${response.status}`
            );
        }

        return data;
    }

    function setupLogout() {

        const button =
            document.getElementById(
                "admin-logout"
            );

        if (!button) return;

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

    function setupActiveNav() {

        const currentPage =
            window.location.pathname
                .split("/")
                .pop();

        document
            .querySelectorAll(".admin-nav a")
            .forEach(
                function (link) {

                    if (
                        link.getAttribute("href") ===
                        currentPage
                    ) {

                        link.classList.add("active");
                    }
                }
            );
    }

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
                    data.total_students ?? 0;
            }

            if (teachers) {
                teachers.textContent =
                    data.total_teachers ?? 0;
            }

            if (classes) {
                classes.textContent =
                    data.total_classes ?? 0;
            }

            if (sessions) {
                sessions.textContent =
                    data.total_attendance_sessions ?? 0;
            }

        } catch (error) {

            console.error(
                "Admin overview error:",
                error
            );
        }
    }

    async function loadAdminTeachers() {

        const table =
            document.getElementById(
                "admin-teachers-table"
            );

        if (!table) return;

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

        if (!table) return;

        try {

            const students =
                await fetchJson(
                    "/admin/students"
                );

            window.adminStudents =
                Array.isArray(students)
                    ? students
                    : [];

            renderAdminStudents(
                window.adminStudents
            );

        } catch (error) {

            console.error(
                "Admin students error:",
                error
            );

            table.innerHTML = `
                <tr>
                    <td colspan="7">
                        Unable to load students.
                    </td>
                </tr>
            `;
        }
    }


    function renderAdminStudents(students) {

        const table =
            document.getElementById(
                "admin-students-table"
            );

        if (!table) return;

        if (
            !Array.isArray(students) ||
            students.length === 0
        ) {

            table.innerHTML = `
                <tr>
                    <td colspan="7">
                        No students found.
                    </td>
                </tr>
            `;

            return;
        }

        table.innerHTML =
            students.map(
                function (student) {

                    const active =
                        Boolean(
                            student.is_active
                        );

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
                                    student.class_name ||
                                    "Not assigned"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    student.batch_name ||
                                    "Not assigned"
                                )}
                            </td>

                            <td>
                                ${statusBadge(
                                    active
                                        ? "Active"
                                        : "Inactive"
                                )}
                            </td>

                            <td>

                                <button
                                    class="student-action-btn"
                                    type="button"
                                    data-student-status="${escapeHtml(
                                        student.student_id
                                    )}"
                                    data-active="${active}"
                                >
                                    ${
                                        active
                                            ? "Deactivate"
                                            : "Reactivate"
                                    }
                                </button>

                            </td>

                        </tr>
                    `;
                }
            ).join("");
    }


    async function loadStudentFormOptions() {

        const classSelect =
            document.getElementById(
                "student-class"
            );

        const batchSelect =
            document.getElementById(
                "student-batch"
            );

        if (
            !classSelect ||
            !batchSelect
        ) {
            return;
        }

        classSelect.innerHTML = `
            <option value="">
                Select class
            </option>
        `;

        batchSelect.innerHTML = `
            <option value="">
                Select batch
            </option>
        `;

        const [
            classes,
            batches
        ] =
            await Promise.all([
                fetchJson("/admin/classes"),
                fetchJson("/admin/batches")
            ]);

        if (Array.isArray(classes)) {

            classes.forEach(
                function (classItem) {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        classItem.id;

                    option.textContent =
                        classItem.name;

                    classSelect.appendChild(
                        option
                    );
                }
            );
        }

        if (Array.isArray(batches)) {

            batches.forEach(
                function (batch) {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        batch.id;

                    option.textContent =
                        batch.name;

                    batchSelect.appendChild(
                        option
                    );
                }
            );
        }
    }


    function setupStudentManagement() {

        const addButton =
            document.getElementById(
                "admin-add-student"
            );

        const modal =
            document.getElementById(
                "student-modal"
            );

        const closeButton =
            document.getElementById(
                "close-student-modal"
            );

        const form =
            document.getElementById(
                "admin-student-form"
            );

        const searchInput =
            document.getElementById(
                "admin-student-search"
            );

        const errorBox =
            document.getElementById(
                "student-form-error"
            );

        if (
            !addButton ||
            !modal ||
            !closeButton ||
            !form
        ) {
            return;
        }


        function showError(message) {

            if (!errorBox) return;

            errorBox.textContent =
                message;

            errorBox.style.display =
                "block";
        }


        function clearError() {

            if (!errorBox) return;

            errorBox.textContent =
                "";

            errorBox.style.display =
                "none";
        }


        function closeModal() {

            modal.style.display =
                "none";

            form.reset();

            clearError();
        }


        addButton.addEventListener(
            "click",
            async function () {

                modal.style.display =
                    "flex";

                clearError();

                try {

                    await loadStudentFormOptions();

                } catch (error) {

                    console.error(
                        "Student form options error:",
                        error
                    );

                    showError(
                        "Unable to load classes and batches."
                    );
                }
            }
        );


        closeButton.addEventListener(
            "click",
            closeModal
        );


        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    closeModal();
                }
            }
        );


        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                clearError();


                const payload = {

                    student_id:
                        document.getElementById(
                            "student-id"
                        ).value.trim(),

                    name:
                        document.getElementById(
                            "student-name"
                        ).value.trim(),

                    email:
                        document.getElementById(
                            "student-email"
                        ).value.trim(),

                    password:
                        document.getElementById(
                            "student-password"
                        ).value,

                    class_id:
                        Number(
                            document.getElementById(
                                "student-class"
                            ).value
                        ),

                    batch_id:
                        Number(
                            document.getElementById(
                                "student-batch"
                            ).value
                        )
                };


                if (
                    !payload.student_id ||
                    !payload.name ||
                    !payload.email ||
                    !payload.password
                ) {

                    showError(
                        "Please fill in all required fields."
                    );

                    return;
                }


                if (
                    !payload.class_id ||
                    !payload.batch_id
                ) {

                    showError(
                        "Please select both a class and a batch."
                    );

                    return;
                }


                try {

                    await fetchJson(
                        "/admin/students",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );


                    closeModal();

                    alert(
                        "Student created successfully."
                    );

                    await loadAdminStudents();

                } catch (error) {

                    console.error(
                        "Create student error:",
                        error
                    );

                    showError(
                        error.message
                    );
                }
            }
        );


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                function () {

                    const query =
                        this.value
                            .trim()
                            .toLowerCase();


                    const filtered =
                        (
                            window.adminStudents ||
                            []
                        )
                        .filter(
                            function (student) {

                                return [
                                    student.student_id,
                                    student.name,
                                    student.email,
                                    student.class_name,
                                    student.batch_name
                                ]
                                .join(" ")
                                .toLowerCase()
                                .includes(query);
                            }
                        );


                    renderAdminStudents(
                        filtered
                    );
                }
            );
        }


        document.addEventListener(
            "click",
            async function (event) {

                const button =
                    event.target.closest(
                        "[data-student-status]"
                    );

                if (!button) return;


                const studentId =
                    button.dataset.studentStatus;


                const currentlyActive =
                    button.dataset.active ===
                    "true";


                const action =
                    currentlyActive
                        ? "deactivate"
                        : "reactivate";


                if (
                    !confirm(
                        `Are you sure you want to ${action} ${studentId}?`
                    )
                ) {
                    return;
                }


                try {

                    await fetchJson(
                        `/admin/students/${encodeURIComponent(
                            studentId
                        )}/status`,
                        {
                            method: "PATCH",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    is_active:
                                        !currentlyActive
                                })
                        }
                    );


                    await loadAdminStudents();

                } catch (error) {

                    console.error(
                        "Student status update error:",
                        error
                    );

                    alert(
                        error.message
                    );
                }
            }
        );
    }


    // ========================================
    // M9.11 - BATCHES
    // ========================================

    async function loadAdminBatches() {

        const table =
            document.getElementById(
                "admin-batches-table"
            );

        if (!table) return;

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

        if (!table) return;

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

        if (!table) return;

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

        if (!table) return;

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

        if (!table) return;

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

            let totalPossible = 0;
            let totalPresent = 0;

            if (
                Array.isArray(reports)
            ) {

                reports.forEach(
                    function (report) {

                        totalPossible +=
                            Number(
                                report.students || 0
                            ) *
                            Number(
                                report.sessions || 0
                            );

                        totalPresent +=
                            Number(
                                report.present_records || 0
                            );
                    }
                );
            }

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
                    overview.total_students ?? 0;
            }

            if (totalSessions) {

                totalSessions.textContent =
                    overview.total_attendance_sessions ?? 0;
            }

            if (!table) return;

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

    setupStudentManagement();

    loadAdminBatches();

    loadAdminClasses();

    loadAdminSubjects();

    loadAdminTimetable();

    loadAdminAttendance();

    loadAdminReports();

})();