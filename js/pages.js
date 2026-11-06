// Build the HTML for each page and dashboard.
function renderNav() {
  let n = $("#nav");
  n.innerHTML = menus[role]
    .map(
      ([g, a]) =>
        `<div class="nav-group">${g}</div>${a
          .map(
            ([x, i]) =>
              `<button class="nav-item ${
                page === x ? "active" : ""
              }" data-page="${esc(
                x,
              )}"><span class="nav-icon">${i}</span>${esc(x)}${x.includes("Queue") && mine().length ? `<span class="nav-count">${mine().length}</span>` : ""}</button>`,
          )
          .join("")}`,
    )
    .join("");
  $("#roleLabel").textContent = apiMode ? role : `${role} · Preview`;
  $("#userName").textContent = who();
  $("#userMeta").textContent = currentUser ? [currentUser.department, currentUser.classSection].filter(Boolean).join(" · ") || "College account" : people[role]?.[1] || "College account";
  $("#avatar").textContent = initials(who());
  $("#topAvatar").textContent = initials(who());
  $("#pageCrumb").textContent = page;
}
function head(t, d, b = "") {
  return `<div class="page-head"><div><div class="eyebrow">${esc(role)} workspace</div><h1 class="page-title">${esc(t)}</h1><p class="subhead">${esc(d)}</p></div>${b}</div>`;
}
function stats(a) {
  return `<div class="stats">${a
    .map(
      ([l, v, n, c]) =>
        `<div class="stat"><div class="stat-label">${l}</div><div class="stat-value ${
          c || ""
        }">${v}</div><div class="stat-note">${n}</div></div>`,
    )
    .join("")}</div>`;
}
function reqrow(r) {
  return `<div class="list-row"><div class="row-main"><strong>${esc(r.event)}</strong><small>${esc(r.id)} · ${esc(r.student)} · ${esc(r.type)} event</small></div><div class="row-end">${badge(r.status)}<button class="btn secondary small" data-open="${
    r.id
  }">View</button></div></div>`;
}
// Role dashboards and page content.
function dashboard() {
  let a = role === "Admin" ? data.requests : mine(),
    pending = a.filter((r) => r.status.startsWith("Pending"));
  let desc =
    role === "Student"
      ? "Your event registrations, OD decisions and recorded attendance."
      : role === "Event Coordinator"
        ? "Publish inter-college events and follow each registered student’s OD progress."
        : role === "DEO"
          ? "Record attendance only after the required approvals are complete."
          : role === "Class In-charge"
            ? "Check event details, proof and missed class sessions for your assigned class."
            : role === "Department Coordinator"
              ? "Review requests after the Class In-charge has recorded a decision."
              : role === "Director"
                ? "Complete the final review before an approved request reaches the DEO."
                : "Manage college accounts and inspect workflow records.";
  let act =
    role === "Student"
      ? '<button class="btn" data-page="New Outside-College Request">＋ New OD request</button>'
      : role === "Event Coordinator"
        ? '<button class="btn" data-page="Create Event">＋ Create event</button>'
        : "";
  let c =
    role === "Student"
      ? [
          ["My requests", a.length, "All submitted requests"],
          ["Awaiting review", pending.length, "In approval chain", "accent"],
          [
            "Need my action",
            a.filter(
              (r) =>
                r.status === "Returned for Correction" ||
                r.status === "Awaiting Certificate",
            ).length,
            "Correction or certificate",
          ],
          [
            "Attendance recorded",
            a.filter((r) => r.status === "Attendance Recorded").length,
            "In your record",
          ],
        ]
      : role === "Event Coordinator"
        ? [
            ["Published events", data.events.filter(e => !e.status || e.status === "published").length, "Managed by you"],
            [
              "Registrations",
              data.events.reduce((n, e) => n + e.registered, 0),
              "Across events",
            ],
            [
              "Open OD requests",
              data.requests.filter(
                (r) =>
                  r.type === "Inter-college" &&
                  !["Attendance Recorded", "Rejected"].includes(r.status),
              ).length,
              "Linked to events",
            ],
            [
              "Recorded",
              data.requests.filter(
                (r) =>
                  r.type === "Inter-college" &&
                  r.status === "Attendance Recorded",
              ).length,
              "Completed",
            ],
          ]
        : role === "Admin"
          ? [
              ["Events", data.events.length, "In the college workspace"],
              ["OD requests", data.requests.length, "Workflow records"],
              ["Awaiting review", data.requests.filter(r => r.status.startsWith("Pending")).length, "Across approval stages"],
              ["Attendance recorded", data.requests.filter(r => r.status === "Attendance Recorded").length, "Completed records"],
            ]
          : [
            ["Awaiting your review", pending.length, "Current queue", "accent"],
            ["Requests in this view", data.requests.length, "Limited to your access"],
            [
              "Returned for correction",
              data.requests.filter(
                (r) => r.status === "Returned for Correction",
              ).length,
              "Student action required",
            ],
            [
              "Attendance recorded",
              data.requests.filter((r) => r.status === "Attendance Recorded")
                .length,
              "Completed records",
            ],
          ];
  let dest =
    role === "Student"
      ? "My OD Requests"
      : role === "Event Coordinator"
        ? "OD Requests"
        : role === "DEO"
          ? "Attendance Queue"
          : role === "Class In-charge"
            ? "OD Review Queue"
            : role === "Department Coordinator"
              ? "Department Review Queue"
              : role === "Admin" ? "Profile" : "Director Review Queue";
  let feed =
    role === "Student"
      ? a
      : role === "Event Coordinator"
        ? data.requests.filter((r) => r.type === "Inter-college")
        : a;
  let viewAll = role === "Admin" ? "" : `<button class="link-btn" data-page="${esc(dest)}">View all →</button>`;
  const guidance = {
    Student: { title: "Two event routes", detail: "Inter-college: register → attend → upload certificate → three reviews → DEO. Outside-college: submit plan and registration proof → Class In-charge → Department Coordinator → attend and upload certificate → Director → DEO." },
    "Event Coordinator": { title: "Event handoff", detail: "Set the eligible departments and classes before publishing. Registrations create a linked OD request; review progress appears under Event Registrations." },
    "Class In-charge": { title: "Your review step", detail: "Outside-college requests arrive with registration proof and proposed class sessions. Inter-college requests arrive after the student uploads a certificate." },
    "Department Coordinator": { title: "Department review", detail: "Check the Class In-charge decision and comments. Outside-college requests return to the student for a certificate only after this approval." },
    Director: { title: "Final approval", detail: "Review the submitted evidence. Outside-college requests reach you only after the student adds the post-event certificate." },
    DEO: { title: "Attendance entry", detail: "Requests appear here after all required approvals. Select the applicable class sessions and save to add them to the student’s record." },
    Admin: { title: "Account and access setup", detail: "Create student and staff accounts through the admin user API. Assign each Class In-charge to the matching department and class section." }
  }[role];
  return `${head(`Good morning, ${who().split(" ")[0]}`, desc, act)}${stats(c)}<div class="grid-two"><section class="panel"><div class="panel-head"><div><h2>${role === "Student" ? "Your OD requests" : role === "Event Coordinator" ? "Recent event requests" : role === "DEO" ? "Ready for attendance" : role === "Admin" ? "Workflow records" : "Requests to review"}</h2><p>${role === "Student" ? "Follow each request to its outcome." : role === "Admin" ? "Records visible to the administrator." : "Requests available in your assigned scope."}</p></div>${viewAll}</div><div class="panel-body row-list">${feed.slice(0, 5).map(reqrow).join("") || '<div class="empty">Nothing needs attention right now.</div>'}</div></section><section class="panel"><div class="panel-head"><div><h2>${esc(guidance.title)}</h2><p>${apiMode ? "Workflow guidance" : "Preview workflow"}</p></div></div><div class="panel-body"><p class="guide-copy">${esc(guidance.detail)}</p>${role === "Student" ? '<div class="notice">A returned request stays open for correction. A rejection includes the reviewer’s reason.</div>' : ""}</div></section></div>${role === "Student" ? `<div style="height:16px"></div><section class="panel"><div class="panel-head"><div><h2>Upcoming inter-college events</h2><p>Events open to eligible students</p></div><button class="link-btn" data-page="Inter-College Events">Browse events →</button></div><div class="panel-body row-list">${data.events.slice(0, 2).map(eventRow).join("")}</div></section>` : ""}`;
}
function eventRow(e) {
  return `<div class="list-row"><div class="event-date"><strong>${e.start.slice(8, 10)}</strong><span>${new Date(e.start + "T12:00:00").toLocaleString("en", { month: "short" })}</span></div><div class="row-main"><strong>${esc(e.name)}</strong><small>${esc(e.host)} · ${esc(e.venue)}</small></div><button class="btn secondary small" data-event="${
    e.id
  }">Details</button></div>`;
}
function eventList() {
  return `${head("Inter-College Events", "Browse events available to eligible students. Upload the certificate after attending.")}<div class="toolbar"><input class="search" id="eventSearch" placeholder="Search events or host college…" value="${esc(
  search,
  )}"><select class="filter" id="eventFilter"><option>All</option><option>Technology</option><option>Cultural</option><option>Engineering</option><option>Academic</option><option>Other</option></select></div><div class="event-grid">${
    data.events
      .filter(
        (e) =>
          (e.name + " " + e.host)
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (filter === "All" || filter === e.category),
      )
      .map(
        (e) =>
          `<article class="event-card"><div class="event-cover"><span>${esc(e.category)} · Inter-college</span></div><div class="event-card-body"><h3>${esc(e.name)}</h3><p>${esc(e.host)} · ${esc(e.dates)}</p><div class="event-meta"><span>◷ ${esc(e.venue)}</span><span>${e.registered} registered</span></div><button class="btn secondary small" data-event="${
            e.id
          }">Details</button> <button class="btn small" data-register="${
            e.id
          }">Register</button></div></article>`,
      )
      .join("") || '<div class="empty">No events match your search.</div>'
  }</div>`;
}
function table(rows, review = false) {
  return `<div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Request</th><th>Student</th><th>Event type</th><th>Dates</th><th>Status</th><th>Action</th></tr></thead><tbody>${
    rows
      .map(
        (r) =>
          `<tr><td><strong>${esc(r.event)}</strong><small>${esc(r.id)}</small></td><td><strong>${esc(r.student)}</strong><small>${esc(r.roll)} · ${esc(r.department)}</small></td><td>${esc(r.type)}</td><td>${esc(r.dates)}</td><td>${badge(r.status)}</td><td><button class="btn secondary small" data-open="${
            r.id
          }">${review ? "Review" : "Details"}</button></td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="6"><div class="empty">No requests match this view.</div></td></tr>'
  }</tbody></table></div></div>`;
}
function requestsPage(review = false, history = false) {
  let rows = history
    ? data.requests.filter((r) => apiMode
      ? (r.decisions || []).some(d => d.stage === ({ "Class In-charge": "class_incharge", "Department Coordinator": "department_coordinator", Director: "director" }[role]))
      : r.history.some((h) => h[0].includes(role)))
    : role === "Student"
      ? data.requests.filter((r) => r.student === who())
      : role === "Event Coordinator"
        ? data.requests.filter((r) => r.type === "Inter-college")
        : mine();
  rows = rows.filter(
    (r) =>
      (r.event + " " + r.student + " " + r.id)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "All" || filter === r.type || filter === r.status),
  );
  let title = history
    ? "Reviewed Requests"
    : role === "Student"
      ? "My OD Requests"
      : role === "Event Coordinator"
        ? "OD Requests"
        : role === "DEO"
          ? "Attendance Queue"
          : role === "Class In-charge"
            ? "OD Review Queue"
            : role === "Department Coordinator"
              ? "Department Review Queue"
              : "Director Review Queue";
  return `${head(title, role === "Student" ? "View request status, decisions, correction instructions and attendance." : role === "DEO" ? "Only fully approved requests are ready for attendance entry." : review ? "Requests currently assigned to your review step." : "Requests linked to inter-college events. ", role === "Student" ? '<button class="btn" data-page="New Outside-College Request">＋ New request</button>' : "")}<div class="toolbar"><input class="search" id="tableSearch" placeholder="Search request, event, or student…" value="${esc(
    search,
  )}"><select class="filter" id="typeFilter"><option>All</option><option>Inter-college</option><option>Outside-college</option><option>Attendance Recorded</option><option>Rejected</option><option>Returned for Correction</option></select></div>${table(rows, review)}`;
}
function createEvent() {
  return `${head("Create inter-college event", "Publish the event details students need before they register.")}<div class="panel"><div class="panel-head"><div><h2>Event details</h2><p>Fields marked * are required.</p></div></div><div class="panel-body"><form id="eventForm"><div class="form-grid"><div class="form-field"><label>Event name *</label><input name="name" required maxlength="180"></div><div class="form-field"><label>Host college *</label><input name="host" required maxlength="180"></div><div class="form-field"><label>Start date *</label><input name="start" type="date" required></div><div class="form-field"><label>End date *</label><input name="end" type="date" required></div><div class="form-field"><label>Venue *</label><input name="venue" required maxlength="250"></div><div class="form-field"><label>Category</label><select name="category"><option>Technology</option><option>Cultural</option><option>Engineering</option><option>Academic</option><option>Other</option></select></div><div class="form-field full"><label>Registration details *</label><textarea name="registration" required maxlength="2000" placeholder="Registration link, deadline, fee, or instructions"></textarea></div><div class="form-field full"><label>Eligible departments</label><select name="departments" multiple size="4"><option>CSE</option><option>ACSE</option><option>DS</option><option>CS</option><option>ECE</option><option>PHARMACY</option><option>MBA</option><option>BBA</option><option>BCA</option></select><span class="hint">Leave unselected if students from every department are eligible. Hold Ctrl or Command to select more than one.</span></div><div class="form-field full"><label>Eligible class or section (optional)</label><input name="classes" placeholder="For example: 3rd Year, Section B"></div></div><div class="form-actions"><button class="btn secondary" type="reset">Clear</button><button class="btn" type="submit">Publish event</button></div></form></div></div>`;
}
function newRequest() {
  return `${head("New outside-college request", "Submit the event plan and the sessions you expect to miss.")}<div class="panel"><div class="panel-head"><div><h2>Event and OD details</h2><p>Registration proof is required for the first review.</p></div></div><div class="panel-body"><form id="requestForm"><div class="form-grid"><div class="form-field"><label>Event name *</label><input name="event" required maxlength="180"></div><div class="form-field"><label>Organizer *</label><input name="organizer" required maxlength="180"></div><div class="form-field"><label>Start date *</label><input name="start" type="date" required></div><div class="form-field"><label>End date *</label><input name="end" type="date" required></div><div class="form-field full"><label>Venue or online details *</label><input name="venue" required maxlength="250" placeholder="Campus, city, or online platform"></div><div class="form-field full"><label>Class sessions expected to miss *</label><textarea name="sessions" required placeholder="One session per line: YYYY-MM-DD | course code | course name | period\n2026-11-18 | CS201 | Algorithms | 2"></textarea><span class="hint">Use one line for each class period. These are the sessions the DEO can record after approval.</span></div><div class="form-field full"><label>Registration proof *</label><input type="file" name="proof" required accept=".pdf,.png,.jpg,.jpeg,.webp"><span class="hint">Registration screenshot, ticket, or confirmation email (PDF, JPG, PNG, WEBP).</span></div></div><div class="notice">Class In-charge and Department Coordinator review the plan. After attending, attach the certificate to this same request for the Director.</div><div class="form-actions"><button class="btn" type="submit">Submit request</button></div></form></div></div>`;
}
function myEvents() {
  return `${head("My Events", "Inter-college events created and managed by you.", '<button class="btn" data-page="Create Event">＋ Create event</button>')}<div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Event</th><th>Host college</th><th>Dates</th><th>Eligible audience</th><th>Registrations</th></tr></thead><tbody>${data.events.map((e) => `<tr><td><strong>${esc(e.name)}</strong><small>${esc(e.category)}</small></td><td>${esc(e.host)}</td><td>${esc(e.dates)}</td><td>${esc(e.eligibility)}</td><td>${e.registered}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function attendance() {
  let rows = data.requests.filter(
    (r) =>
      r.status === "Attendance Recorded" &&
      (role !== "Student" || r.student === who()) &&
      (role !== "DEO" || !apiMode || !!r.attendanceEntry),
  );
  return `${head(role === "Student" ? "My Attendance" : "Attendance History", "Attendance entries recorded by the DEO are added to the student record.")}<div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Event</th><th>Student</th><th>Sessions</th><th>Attendance</th><th>Record</th></tr></thead><tbody>${rows.map((r) => `<tr><td><strong>${esc(r.event)}</strong><small>${esc(r.id)} · ${esc(r.type)}</small></td><td><strong>${esc(r.student)}</strong><small>${esc(r.roll)}</small></td><td>${esc(r.sessions)}</td><td>${badge(r.attendance || "Present")}</td><td>${esc(r.history.at(-1)?.[1] || "Recorded")}</td></tr>`).join("") || '<tr><td colspan="5"><div class="empty">No attendance has been recorded yet.</div></td></tr>'}</tbody></table></div></div>`;
}
function registrations() {
  return `${head("Event Registrations", "Students registered for inter-college events.")}<div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Event</th><th>Dates</th><th>Department</th><th>OD status</th></tr></thead><tbody>${data.requests
    .filter((r) => r.type === "Inter-college")
    .map(
      (r) =>
        `<tr><td><strong>${esc(r.student)}</strong><small>${esc(r.roll)}</small></td><td>${esc(r.event)}</td><td>${esc(r.dates)}</td><td>${esc(r.department)} · ${esc(r.year)}</td><td>${badge(r.status)}</td></tr>`,
    )
    .join("")}</tbody></table></div></div>`;
}
function profile() {
  return `${head("Profile", "Account details used to route your requests and review access.")}<div class="panel"><div class="panel-body"><div class="detail-grid"><div><span class="field-label">Name</span><div class="field-value">${esc(who())}</div></div><div><span class="field-label">Role</span><div class="field-value">${esc(role)}</div></div><div><span class="field-label">Department / class</span><div class="field-value">${esc(currentUser ? [currentUser.department, currentUser.classSection].filter(Boolean).join(" · ") : people[role]?.[1])}</div></div><div><span class="field-label">Environment</span><div class="field-value">${apiMode ? "College account" : "Sample data preview"}</div></div></div><div class="notice">${apiMode ? "Your role and department are managed by the college administrator." : "Preview changes stay in this browser and are not submitted for approval."}</div></div></div>`;
}
function timeline(r) {
  let flow =
    r.type === "Inter-college"
      ? ["Class In-charge", "Department Coordinator", "Director", "DEO"]
      : [
          "Class In-charge",
          "Department Coordinator",
          "Awaiting Certificate",
          "Director",
          "DEO",
        ];
  return `<div class="timeline">${flow
    .map((s, i) => {
      let key =
          s === "Awaiting Certificate"
            ? "Certificate uploaded"
            : s === "DEO"
              ? "Attendance recorded"
              : s,
        hit = r.history.find((h) => h[0].includes(key));
      let done = !!hit,
        cur =
          !done &&
          ((r.status === "Pending Class In-charge" && s === flow[0]) ||
            (r.status === "Pending Department Coordinator" &&
              s === "Department Coordinator") ||
            (r.status === "Awaiting Certificate" &&
              s === "Awaiting Certificate") ||
            (r.status === "Pending Director" && s === "Director") ||
            (r.status === "Pending DEO" && s === "DEO"));
      return `<div class="timeline-entry"><div class="timeline-dot ${
        done ? "done" : cur ? "current" : ""
      }"></div><div><strong>${esc(s)} · ${done ? "Complete" : cur ? "Current step" : "Waiting"}</strong><small>${hit ? esc(hit[1]) : cur ? "Action required" : "Waiting for previous step"}</small></div></div>`;
    })
    .join("")}</div>`;
}
function eventDetail(e) {
  return `${head(e.name, `${e.host} · ${e.dates}`, '<button class="btn secondary" data-page="Inter-College Events">← Back to events</button>')}<div class="detail-layout"><section class="panel"><div class="panel-head"><div><h2>Event information</h2><p>Inter-college event listing</p></div>${badge(e.category)}</div><div class="panel-body"><div class="detail-grid"><div><span class="field-label">Host college</span><div class="field-value">${esc(e.host)}</div></div><div><span class="field-label">Dates</span><div class="field-value">${esc(e.dates)}</div></div><div><span class="field-label">Venue</span><div class="field-value">${esc(e.venue)}</div></div><div><span class="field-label">Eligibility</span><div class="field-value">${esc(e.eligibility)}</div></div><div class="full"><span class="field-label">Registration</span><div class="field-value">${esc(e.registration)}</div></div></div><div class="notice">After attending, upload your certificate to the event request. It then moves through Class In-charge, Department Coordinator, Director, and DEO.</div><button class="btn" data-register="${
    e.id
  }">Register for event</button></div></section><section class="panel"><div class="panel-head"><h2>At a glance</h2></div><div class="panel-body"><div class="activity-item"><div class="activity-mark"></div><div><strong>${e.registered} students registered</strong><small>Registration is subject to eligibility.</small></div></div><div class="activity-item"><div class="activity-mark"></div><div><strong>Certificate required</strong><small>Upload after attending.</small></div></div></div></section></div>`;
}
// Request detail combines uploaded evidence, history, and next-step actions.
function requestDetail(r) {
  let review =
    (role === "Class In-charge" && r.status === "Pending Class In-charge") ||
    (role === "Department Coordinator" &&
      r.status === "Pending Department Coordinator") ||
    (role === "Director" && r.status === "Pending Director");
  let deo = role === "DEO" && r.status === "Pending DEO",
    student = role === "Student" && r.student === who(),
    cert =
      student &&
      r.type === "Outside-college" &&
      r.status === "Awaiting Certificate",
    interCert =
      student &&
      r.type === "Inter-college" &&
      !r.certificate &&
      r.status !== "Rejected";
  let back =
    role === "Student"
      ? "My OD Requests"
      : role === "DEO"
        ? "Attendance Queue"
        : role === "Event Coordinator"
          ? "OD Requests"
          : role === "Class In-charge"
            ? "OD Review Queue"
            : role === "Department Coordinator"
              ? "Department Review Queue"
              : "Director Review Queue";
  return `${head(r.event, `${r.id} · ${r.type} event`, '<button class="btn secondary" data-page="' + back + '">← Back to list</button>')}<div class="detail-layout"><section class="panel"><div class="panel-head"><div><h2>Request details</h2><p>${esc(r.student)} · ${esc(r.roll)}</p></div>${badge(r.status)}</div><div class="panel-body"><div class="detail-section"><h3>Event information</h3><div class="detail-grid">${[
    ["Event", r.event],
    ["Organizer", r.organizer],
    ["Dates", r.dates],
    ["Venue / format", r.venue],
    ["Department and year", r.department + " · " + r.year],
    ["Class sessions", r.sessions],
  ]
    .map(
      ([k, v]) =>
        `<div><span class="field-label">${k}</span><div class="field-value">${esc(v)}</div></div>`,
    )
    .join(
      "",
    )}</div></div><div class="detail-section"><h3>Uploaded files</h3>${r.proof ? `<div class="list-row"><span>▧</span><div class="row-main"><strong>Registration proof</strong><small>${esc(r.proof)}</small></div>${apiMode && r.proofId ? `<button class="btn secondary small" data-download-file="${r.id}:${r.proofId}" data-filename="${esc(r.proof)}">Download</button>` : badge("Attached")}</div>` : ""}<div class="list-row"><span>▧</span><div class="row-main"><strong>Event certificate</strong><small>${esc(r.certificate || "Not uploaded")}</small></div>${r.certificate && apiMode && r.certificateId ? `<button class="btn secondary small" data-download-file="${r.id}:${r.certificateId}" data-filename="${esc(r.certificate)}">Download</button>` : ""}${
    !r.certificate && student && (cert || interCert)
      ? `<button class="btn small" data-upload-cert="${r.id}">Upload</button>`
      : ""
  }</div></div>${
    r.reason
      ? `<div class="detail-section"><h3>${r.status === "Returned for Correction" ? "Correction instructions" : "Reviewer reason"}</h3><div class="notice">${esc(r.reason)}</div>${
          student && r.status === "Returned for Correction"
            ? `<button class="btn small" data-correct="${
                r.id
              }">Update and resubmit</button>`
            : ""
        }</div>`
      : ""
  }${cert ? '<div class="notice">Upload the certificate after attending. The Director reviews it next.</div>' : ""}${
    interCert
      ? `<div class="notice">After attending, upload the certificate to continue the approval process.</div><button class="btn small" data-upload-cert="${
          r.id
        }">Upload certificate</button>`
      : ""
  }${
    review
      ? `<div class="detail-section"><div class="decision-box"><h3>Your review is required</h3><p>Check the event details, evidence and previous decisions. Add a reason when rejecting or returning.</p><div class="decision-actions"><button class="btn success" data-decision="approve" data-id="${
          r.id
        }">Approve</button><button class="btn danger" data-decision="reject" data-id="${
          r.id
        }">Reject</button>${
          r.type === "Outside-college"
            ? `<button class="btn secondary" data-decision="return" data-id="${
                r.id
              }">Return for correction</button>`
            : ""
        }</div></div></div>`
      : ""
  }${
    deo
      ? `<div class="detail-section"><div class="decision-box"><h3>Record attendance</h3><p>All required approvals are complete. Select the sessions this record should cover.</p>${apiMode ? (r.sessionItems || []).map(s => `<label class="session-choice"><input type="checkbox" name="sessionChoice" value="${esc(s.id)}"><span>${esc(s.label)}</span></label>`).join("") : '<select id="attendanceValue" class="filter"><option>Present</option><option>Partial attendance</option></select>'}<div class="form-field" style="margin-top:12px"><label>DEO note (optional)</label><input id="attendanceNote" maxlength="1000"></div><button class="btn success" data-record-attendance="${
          r.id
        }">Save attendance</button></div></div>`
      : ""
  }</div></section><div><section class="panel"><div class="panel-head"><div><h2>Approval timeline</h2><p>Required steps for this event type</p></div></div><div class="panel-body">${timeline(r)}</div></section><div style="height:14px"></div><section class="panel"><div class="panel-head"><div><h2>Request history</h2><p>Updates and decisions</p></div></div><div class="panel-body">${r.history
    .slice()
    .reverse()
    .map(
      (h) =>
        `<div class="activity-item"><div class="activity-mark"></div><div><strong>${esc(h[0])}</strong><small>${esc(h[1])}</small></div></div>`,
    )
    .join("")}</div></section></div></div>`;
}
// Draw the active page. Signed-out users only see the login screen.
function render() {
  if (!loggedIn) {
    $("#appShell").classList.add("auth-hidden");
    showLogin();
    return;
  }
  $("#appShell").classList.remove("auth-hidden");
  $("#loginScreen").innerHTML = "";
  renderNav();
  let root = $("#content");
  if (activeId) {
    let r = data.requests.find((x) => x.id === activeId),
      e = data.events.find((x) => x.id === activeId);
    root.innerHTML = r ? requestDetail(r) : e ? eventDetail(e) : dashboard();
    return;
  }
  switch (page) {
    case "Dashboard":
      root.innerHTML = dashboard();
      break;
    case "Inter-College Events":
      root.innerHTML = eventList();
      break;
    case "My OD Requests":
    case "OD Requests":
    case "Attendance Queue":
    case "OD Review Queue":
    case "Department Review Queue":
    case "Director Review Queue":
      root.innerHTML = requestsPage(
        !["My OD Requests", "OD Requests"].includes(page),
      );
      break;
    case "Reviewed Requests":
      root.innerHTML = requestsPage(false, true);
      break;
    case "New Outside-College Request":
      root.innerHTML = newRequest();
      break;
    case "Create Event":
      root.innerHTML = createEvent();
      break;
    case "My Events":
      root.innerHTML = myEvents();
      break;
    case "Event Registrations":
      root.innerHTML = registrations();
      break;
    case "My Attendance":
    case "Attendance History":
      root.innerHTML = attendance();
      break;
    case "Profile":
      root.innerHTML = profile();
      break;
    default:
      root.innerHTML = dashboard();
  }
}
