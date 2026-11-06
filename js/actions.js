// Handle navigation, forms, approvals, attendance, and sign-in.
function closeMenu() {
  $("#sidebar").classList.remove("open");
}
$("#menuBtn").onclick = () => $("#sidebar").classList.add("open");
$("#closeNav").onclick = closeMenu;
// Route navigation and buttons through delegated handlers because page content
// is rebuilt when the user changes pages or updates a request.
document.addEventListener("click", (e) => {
  let p = e.target.closest("[data-page]");
  if (p) {
    page = p.dataset.page;
    activeId = null;
    search = "";
    filter = "All";
    render();
    closeMenu();
    scrollTo(0, 0);
    return;
  }
  let o = e.target.closest("[data-open]");
  if (o) {
    activeId = o.dataset.open;
    render();
    scrollTo(0, 0);
    return;
  }
  let ev = e.target.closest("[data-event]");
  if (ev) {
    activeId = ev.dataset.event;
    render();
    return;
  }
  let rg = e.target.closest("[data-register]");
  if (rg) {
    registerEvent(rg.dataset.register);
    return;
  }
  let d = e.target.closest("[data-decision]");
  if (d) {
    decide(d.dataset.id, d.dataset.decision);
    return;
  }
  let a = e.target.closest("[data-record-attendance]");
  if (a) {
    record(a.dataset.recordAttendance);
    return;
  }
  let u = e.target.closest("[data-upload-cert]");
  if (u) {
    upload(u.dataset.uploadCert);
    return;
  }
  let c = e.target.closest("[data-correct]");
  if (c) {
    correct(c.dataset.correct);
    return;
  }
});
document.addEventListener("input", (e) => {
  if (!["tableSearch", "eventSearch"].includes(e.target.id)) return;
  let id = e.target.id;
  search = e.target.value;
  let pos = e.target.selectionStart;
  render();
  let x = $("#" + id);
  if (x) {
    x.focus();
    x.setSelectionRange(pos, pos);
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "typeFilter" || e.target.id === "eventFilter") {
    filter = e.target.value;
    render();
  }
});
// Create events and outside-college requests from their forms.
document.addEventListener("submit", (e) => {
  if (e.target.id === "requestForm") {
    e.preventDefault();
    let f = new FormData(e.target),
      file = f.get("proof");
    if (!file?.name) {
      toast("Attach registration proof to submit.");
      return;
    }
    let id = "OD-" + (26042 + data.requests.length),
      fmt = (v) =>
        new Date(v + "T12:00:00").toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
    data.requests.unshift({
      id,
      type: "Outside-college",
      student: who(),
      roll: "23CS041",
      department: "CSE",
      year: "3rd Year",
      event: f.get("event"),
      organizer: f.get("organizer"),
      dates:
        fmt(f.get("start")) +
        (f.get("start") !== f.get("end") ? " – " + fmt(f.get("end")) : ""),
      venue: f.get("venue"),
      sessions: f.get("sessions"),
      proof: file.name,
      certificate: "",
      status: "Pending Class In-charge",
      history: [
        [
          "Submitted by " + who(),
          "Registration proof attached · " + new Date().toLocaleDateString(),
        ],
      ],
      reason: "",
    });
    save();
    page = "My OD Requests";
    render();
    toast("Request submitted to the Class In-charge.");
  }
  if (e.target.id === "eventForm") {
    e.preventDefault();
    let f = new FormData(e.target),
      fmt = (v) =>
        new Date(v + "T12:00:00").toLocaleDateString("en", {
          day: "numeric",
          month: "short",
        }),
      s = f.get("start"),
      z = f.get("end");
    data.events.unshift({
      id: "ev" + Date.now(),
      name: f.get("name"),
      host: f.get("host"),
      dates: fmt(s) + (s !== z ? "–" + fmt(z) : ""),
      start: s,
      venue: f.get("venue"),
      registration: f.get("registration"),
      eligibility: f.get("eligibility"),
      category: f.get("category"),
      registered: 0,
    });
    save();
    page = "My Events";
    render();
    toast("Inter-college event published.");
  }
});
// Workflow actions: register, review, record attendance, and upload evidence.
function registerEvent(id) {
  let e = data.events.find((x) => x.id === id);
  if (!e) return;
  if (data.requests.some((r) => r.student === who() && r.event === e.name)) {
    toast("You already have a request for this event.");
    return;
  }
  e.registered++;
  let r = {
    id: "OD-" + (26042 + data.requests.length),
    type: "Inter-college",
    student: who(),
    roll: "23CS041",
    department: "CSE",
    year: "3rd Year",
    event: e.name,
    organizer: e.host,
    dates: e.dates,
    venue: e.venue,
    sessions: "To be confirmed based on event schedule",
    proof: "",
    certificate: "",
    status: "Awaiting Certificate",
    history: [
      [
        "Registered by " + who(),
        "Event registration · " + new Date().toLocaleDateString(),
      ],
    ],
    reason: "",
  };
  data.requests.unshift(r);
  save();
  page = "My OD Requests";
  activeId = r.id;
  render();
  toast("Registration saved. Upload the certificate after attending.");
}
function modal(title, body, label, cb, danger = false) {
  $("#modalRoot").innerHTML =
    `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn modal-close" data-dismiss>×</button></div><div class="modal-body">${body}<div class="form-actions"><button class="btn secondary" data-dismiss>Cancel</button><button id="modalSubmit" class="btn ${
      danger ? "danger" : ""
    }">${label}</button></div></div></div></div>`;
  $("#modalRoot").onclick = (e) => {
    if (e.target.hasAttribute("data-dismiss")) $("#modalRoot").innerHTML = "";
  };
  $("#modalSubmit").onclick = cb;
}
function decide(id, action) {
  let r = data.requests.find((x) => x.id === id);
  if (action === "approve") {
    modal(
      "Approve OD request",
      '<p class="subhead">Confirm approval at your review step.</p><div class="form-field" style="margin-top:12px"><label>Comment (optional)</label><textarea id="reasonInput"></textarea></div>',
      "Approve",
      () => finish(r, action, $("#reasonInput").value),
    );
  } else
    modal(
      action === "reject" ? "Reject request" : "Return for correction",
      `<p class="subhead">${action === "reject" ? "The request will stop here." : "The student can update and resubmit it."}</p><div class="form-field" style="margin-top:12px"><label>${action === "reject" ? "Rejection reason" : "Correction instructions"} *</label><textarea id="reasonInput" required></textarea></div>`,
      action === "reject" ? "Reject" : "Return",
      () => {
        let v = $("#reasonInput").value.trim();
        if (!v) {
          toast("Enter a reason to continue.");
          return;
        }
        finish(r, action, v);
      },
      true,
    );
}
function finish(r, action, note) {
  let actor =
      role === "Class In-charge"
        ? "Class In-charge"
        : role === "Department Coordinator"
          ? "Department Coordinator"
          : "Director",
    stamp = new Date().toLocaleDateString();
  if (action === "reject") {
    r.status = "Rejected";
    r.reason = note;
    r.history.push(["Rejected · " + actor, note + " · " + stamp]);
  } else if (action === "return") {
    r.status = "Returned for Correction";
    r.stage =
      role === "Class In-charge"
        ? 0
        : role === "Department Coordinator"
          ? 1
          : 2;
    r.reason = note;
    r.history.push(["Returned · " + actor, note + " · " + stamp]);
  } else {
    r.history.push([
      "Approved · " + actor,
      (note || "Approved") + " · " + stamp,
    ]);
    r.reason = "";
    if (role === "Class In-charge") r.status = "Pending Department Coordinator";
    else if (role === "Department Coordinator")
      r.status =
        r.type === "Outside-college" && !r.certificate
          ? "Awaiting Certificate"
          : "Pending Director";
    else r.status = "Pending DEO";
  }
  save();
  $("#modalRoot").innerHTML = "";
  render();
  toast(
    action === "approve"
      ? "Decision recorded."
      : action === "reject"
        ? "Request rejected."
        : "Request returned for correction.",
  );
}
function record(id) {
  let r = data.requests.find((x) => x.id === id),
    value = $("#attendanceValue")?.value || "Present";
  modal(
    "Record attendance",
    `<p class="subhead">Record <strong>${esc(value)}</strong> for ${esc(r.student)} · ${esc(r.event)}. This updates the student attendance record.</p>`,
    "Confirm attendance",
    () => {
      r.status = "Attendance Recorded";
      r.attendance = value;
      r.history.push([
        "Attendance recorded · DEO",
        value + " · " + new Date().toLocaleDateString(),
      ]);
      save();
      $("#modalRoot").innerHTML = "";
      render();
      toast("Attendance recorded.");
    },
  );
}
function upload(id) {
  let r = data.requests.find((x) => x.id === id);
  modal(
    "Upload event certificate",
    '<p class="subhead">Attach the certificate received after attending the event.</p><div class="form-field" style="margin-top:14px"><label>Certificate *</label><input type="file" id="certFile" accept=".pdf,.png,.jpg,.jpeg"></div>',
    "Upload certificate",
    () => {
      let f = $("#certFile").files[0];
      if (!f) {
        toast("Select a certificate file.");
        return;
      }
      r.certificate = f.name;
      r.history.push([
        "Certificate uploaded",
        f.name + " · " + new Date().toLocaleDateString(),
      ]);
      r.status =
        r.type === "Outside-college"
          ? "Pending Director"
          : "Pending Class In-charge";
      save();
      $("#modalRoot").innerHTML = "";
      activeId = r.id;
      render();
      toast("Certificate attached to this request.");
    },
  );
}
function correct(id) {
  let r = data.requests.find((x) => x.id === id);
  modal(
    "Update and resubmit",
    '<p class="subhead">Describe the correction. You may attach updated registration proof.</p><div class="form-field" style="margin-top:12px"><label>Correction made *</label><textarea id="correctionText"></textarea></div><div class="form-field" style="margin-top:12px"><label>Replacement proof (optional)</label><input type="file" id="replacement" accept=".pdf,.png,.jpg,.jpeg"></div>',
    "Resubmit",
    () => {
      let note = $("#correctionText").value.trim();
      if (!note) {
        toast("Describe the correction before resubmitting.");
        return;
      }
      let file = $("#replacement").files[0];
      if (file) r.proof = file.name;
      r.reason = "";
      r.status =
        r.stage === 1
          ? "Pending Department Coordinator"
          : r.stage === 2
            ? "Pending Director"
            : "Pending Class In-charge";
      r.history.push([
        "Resubmitted by " + who(),
        note + " · " + new Date().toLocaleDateString(),
      ]);
      save();
      $("#modalRoot").innerHTML = "";
      activeId = r.id;
      render();
      toast("Request resubmitted.");
    },
  );
}
render();

// Demo sign-in entry screen with a role-specific ID/email field.
function showLogin(form = false) {
  const labels = {
    Student: "Student portal · event registration and OD tracking",
    "Event Coordinator": "Event publishing and registration oversight",
    "Class In-charge": "First level request review",
    "Department Coordinator": "Department request review",
    Director: "Final approval review",
    DEO: "Attendance recording",
  };
  const icons = {
    Student: "S",
    "Event Coordinator": "E",
    "Class In-charge": "C",
    "Department Coordinator": "D",
    Director: "D",
    DEO: "A",
  };
  const formHtml =
    '<button class="btn ghost small auth-back" data-auth-back>← Choose another role</button><div class="eyebrow">SIGN IN TO YOUR WORKSPACE</div><h2>' +
    esc(selectedLoginRole) +
    ' sign in</h2><p class="subhead">Enter your ' +
    (selectedLoginRole === "Student"
      ? "student ID"
      : selectedLoginRole === "DEO"
        ? "staff ID"
        : "institutional email") +
    ' to continue.</p><form id="loginForm" class="auth-form"><div class="auth-form-grid"><div class="form-field"><label>' +
    (selectedLoginRole === "Student"
      ? "Student ID"
      : selectedLoginRole === "DEO"
        ? "Staff ID"
        : "Institutional email") +
    '</label><input name="username" required autocomplete="username" placeholder="' +
    (selectedLoginRole === "Student" ? "e.g. 23CS041" : "name@college.edu") +
    '"></div><div class="form-field"><label>Password</label><input name="password" type="password" required autocomplete="current-password" placeholder="Enter password"></div></div><div class="form-actions"><span class="auth-note">Demo access: any ID and password <b>demo123</b>.</span><button class="btn" type="submit">Sign in →</button></div></form>';
  const chooser =
    '<div class="eyebrow">SECURE WORKSPACE ACCESS</div><h2>Choose your role to sign in</h2><p class="subhead">Select the workspace assigned to your college account.</p><div class="role-grid">' +
    roles
      .map(
        (r) =>
          '<button class="role-card" data-auth-role="' +
          esc(r) +
          '"><span class="role-symbol">' +
          icons[r] +
          "</span><span><strong>" +
          esc(r) +
          "</strong><small>" +
          labels[r] +
          "</small></span></button>",
      )
      .join("") +
    '</div><p class="auth-note" style="margin-top:15px">Prototype sign-in only. Authentication is not connected to a college identity service.</p>';
  $("#loginScreen").innerHTML =
    '<div class="auth-screen"><section class="auth-intro"><div class="auth-brand"><div class="brand-mark">C</div><div><strong>Campus OD</strong><small>Event & On-Duty</small></div></div><div class="auth-copy"><div class="eyebrow">COLLEGE EVENT SERVICES</div><h1>One clear path from event to attendance.</h1><p>Register for events, submit OD requests, review decisions, and record attendance in one place.</p></div><div class="auth-foot">Role-based access · Event and OD workflow</div></section><section class="auth-main"><div class="auth-inner">' +
    (form ? formHtml : chooser) +
    "</div></section></div>";
}
document.addEventListener("click", (e) => {
  const choice = e.target.closest("[data-auth-role]");
  if (choice) {
    selectedLoginRole = choice.dataset.authRole;
    showLogin(true);
  }
  if (e.target.closest("[data-auth-back]")) showLogin(false);
});
document.addEventListener("submit", (e) => {
  if (e.target.id !== "loginForm") return;
  e.preventDefault();
  const f = new FormData(e.target);
  if (f.get("password") !== "demo123") {
    toast("For this prototype, enter demo123 as the password.");
    return;
  }
  role = selectedLoginRole;
  loggedIn = true;
  sessionStorage.setItem("campusOD.role", role);
  sessionStorage.setItem("campusOD.signedIn", "yes");
  page = "Dashboard";
  activeId = null;
  render();
});
$("#logoutBtn").addEventListener("click", () => {
  loggedIn = false;
  sessionStorage.removeItem("campusOD.signedIn");
  sessionStorage.removeItem("campusOD.role");
  page = "Dashboard";
  activeId = null;
  render();
});
