// Demo data, role settings, and shared helpers.
// Campus OD front-end prototype.
// Sample records persist in localStorage. Demo sign-in only uses sessionStorage;
// it does not verify accounts or protect data like a real backend would.

// Roles and demo users shown by the role sign-in screen.
const roles = [
  "Student",
  "Event Coordinator",
  "Class In-charge",
  "Department Coordinator",
  "Director",
  "DEO",
];

const people = {
  Student: ["Ananya Sharma", "CSE · 3rd Year"],
  "Event Coordinator": ["Rohit Menon", "Student Affairs"],
  "Class In-charge": ["Meera Nair", "CSE · Section B"],
  "Department Coordinator": ["Dr. K. Suresh", "Computer Science"],
  Director: ["Dr. R. Iyer", "Academic Office"],
  DEO: ["Latha Thomas", "Examination Office"],
  Admin: ["Administrator", "Account administration"],
};

// Starter records used the first time the page is opened.
const seed = {
  events: [
    {
      id: "ev1",
      name: "National Student Innovation Summit",
      host: "Northbridge Institute of Technology",
      dates: "12–14 Nov 2026",
      start: "2026-11-12",
      venue: "Bengaluru Convention Centre",
      registration: "Register through the event portal · ₹450",
      eligibility: "All departments · UG students",
      category: "Technology",
      registered: 28,
    },
    {
      id: "ev2",
      name: "Inter-College Cultural Confluence",
      host: "St. Agnes College",
      dates: "21 Nov 2026",
      start: "2026-11-21",
      venue: "St. Agnes College, Mangaluru",
      registration: "College team registration · Free",
      eligibility: "Arts, Music and Dance clubs",
      category: "Cultural",
      registered: 16,
    },
    {
      id: "ev3",
      name: "South Zone Robotics Challenge",
      host: "Lakeview Engineering College",
      dates: "04–05 Dec 2026",
      start: "2026-12-04",
      venue: "Lakeview Campus, Mysuru",
      registration: "Team registration · ₹800 per team",
      eligibility: "CSE, ECE and Mechanical · UG",
      category: "Engineering",
      registered: 12,
    },
  ],
  requests: [
    {
      id: "OD-26041",
      type: "Outside-college",
      student: "Ananya Sharma",
      roll: "23CS041",
      department: "CSE",
      year: "3rd Year",
      event: "Open Source India Conference",
      organizer: "Open Source Community India",
      dates: "18–19 Nov 2026",
      venue: "KTPO Convention Centre, Bengaluru",
      sessions: "18 Nov · Sessions 2–6; 19 Nov · Sessions 1–4",
      proof: "osi-registration-confirmation.png",
      certificate: "",
      status: "Pending Class In-charge",
      history: [
        [
          "Submitted by Ananya Sharma",
          "Registration proof attached · 31 Oct, 9:42 AM",
        ],
      ],
      reason: "",
    },
    {
      id: "OD-26037",
      type: "Outside-college",
      student: "Arjun Rao",
      roll: "23CS037",
      department: "CSE",
      year: "3rd Year",
      event: "Cloud Native Developer Day",
      organizer: "Cloud Native Bengaluru",
      dates: "14 Nov 2026",
      venue: "Online · Live stream",
      sessions: "14 Nov · Sessions 1–3",
      proof: "cloudnative-ticket.pdf",
      certificate: "",
      status: "Pending Department Coordinator",
      history: [
        ["Submitted by Arjun Rao", "Proof attached · 29 Oct"],
        ["Approved · Class In-charge", "Approved · 30 Oct"],
      ],
      reason: "",
    },
    {
      id: "OD-26032",
      type: "Inter-college",
      student: "Ananya Sharma",
      roll: "23CS041",
      department: "CSE",
      year: "3rd Year",
      event: "National Student Innovation Summit",
      organizer: "Northbridge Institute of Technology",
      dates: "12–14 Nov 2026",
      venue: "Bengaluru Convention Centre",
      sessions: "12 Nov · Sessions 1–6; 13 Nov · Sessions 1–6",
      proof: "",
      certificate: "ananya-innovation-certificate.pdf",
      status: "Pending Director",
      history: [
        ["Registered by Ananya Sharma", "Certificate uploaded · 30 Oct"],
        ["Approved · Class In-charge", "Approved · 30 Oct"],
        ["Approved · Department Coordinator", "Approved · 31 Oct"],
      ],
      reason: "",
    },
    {
      id: "OD-26028",
      type: "Outside-college",
      student: "Diya Fernandes",
      roll: "24EC028",
      department: "ECE",
      year: "2nd Year",
      event: "Women in Embedded Systems Workshop",
      organizer: "Embedded Systems Society",
      dates: "08 Nov 2026",
      venue: "NITK Surathkal",
      sessions: "08 Nov · Sessions 1–4",
      proof: "embedded-registration.png",
      certificate: "embedded-certificate.pdf",
      status: "Pending DEO",
      history: [
        ["Submitted by Diya Fernandes", "Proof attached · 24 Oct"],
        ["Approved · Class In-charge", "Approved · 25 Oct"],
        ["Approved · Department Coordinator", "Approved · 27 Oct"],
        ["Certificate uploaded", "Uploaded · 29 Oct"],
        ["Approved · Director", "Approved · 30 Oct"],
      ],
      reason: "",
    },
    {
      id: "OD-26019",
      type: "Inter-college",
      student: "Ananya Sharma",
      roll: "23CS041",
      department: "CSE",
      year: "3rd Year",
      event: "National Hack for Good",
      organizer: "City University",
      dates: "10–11 Oct 2026",
      venue: "City University, Bengaluru",
      sessions: "10 Oct · Sessions 1–6; 11 Oct · Sessions 1–6",
      proof: "",
      certificate: "hack-for-good-certificate.pdf",
      status: "Attendance Recorded",
      history: [
        ["Approved · Class In-charge", "Approved · 13 Oct"],
        ["Approved · Department Coordinator", "Approved · 14 Oct"],
        ["Approved · Director", "Approved · 16 Oct"],
        ["Attendance recorded · DEO", "Present · 17 Oct"],
      ],
      reason: "",
      attendance: "Present",
    },
    {
      id: "OD-26015",
      type: "Outside-college",
      student: "Ananya Sharma",
      roll: "23CS041",
      department: "CSE",
      year: "3rd Year",
      event: "Design Systems Meetup",
      organizer: "Design Bengaluru",
      dates: "02 Nov 2026",
      venue: "Indiranagar Social, Bengaluru",
      sessions: "02 Nov · Sessions 3–5",
      proof: "design-meetup-proof.png",
      certificate: "",
      status: "Returned for Correction",
      history: [
        ["Submitted by Ananya Sharma", "Proof attached · 27 Oct"],
        [
          "Returned · Class In-charge",
          "Please add the confirmation email showing the event date · 28 Oct",
        ],
      ],
      reason: "Please add the confirmation email showing the event date.",
    },
  ],
};

// Load saved prototype changes, or start with the sample records above.
let data;
try {
  data = JSON.parse(localStorage.getItem("campusOD.v1")) || seed;
} catch {
  data = seed;
}
let role = sessionStorage.getItem("campusOD.role") || "Student",
  selectedLoginRole = "Student",
  currentUser = (() => { try { return JSON.parse(sessionStorage.getItem("campusOD.user") || "null"); } catch { return null; } })(),
  apiMode = !!sessionStorage.getItem("campusOD.token"),
  loggedIn = apiMode ? !!currentUser : sessionStorage.getItem("campusOD.signedIn") === "yes",
  page = "Dashboard",
  search = "",
  filter = "All",
  activeId = null;

const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
function save() {
  if (!apiMode) localStorage.setItem("campusOD.v1", JSON.stringify(data));
}
function initials(s) {
  return s
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
}
function toast(s) {
  let t = $("#toast");
  t.textContent = s;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}
$("#today").textContent = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
}).format(new Date());
// Navigation is tailored to the currently signed-in role.
const menus = {
  Student: [
    [
      "WORKSPACE",
      [
        ["Dashboard", "◫"],
        ["Inter-College Events", "◇"],
        ["My OD Requests", "▤"],
        ["New Outside-College Request", "＋"],
        ["My Attendance", "✓"],
      ],
    ],
    ["ACCOUNT", [["Profile", "○"]]],
  ],
  "Event Coordinator": [
    [
      "WORKSPACE",
      [
        ["Dashboard", "◫"],
        ["My Events", "◇"],
        ["Create Event", "＋"],
        ["Event Registrations", "▦"],
        ["OD Requests", "▤"],
      ],
    ],
    ["ACCOUNT", [["Profile", "○"]]],
  ],
  "Class In-charge": [
    [
      "REVIEW",
      [
        ["Dashboard", "◫"],
        ["OD Review Queue", "▤"],
        ["Reviewed Requests", "✓"],
      ],
    ],
    ["ACCOUNT", [["Profile", "○"]]],
  ],
  "Department Coordinator": [
    [
      "REVIEW",
      [
        ["Dashboard", "◫"],
        ["Department Review Queue", "▤"],
        ["Reviewed Requests", "✓"],
      ],
    ],
    ["ACCOUNT", [["Profile", "○"]]],
  ],
  Director: [
    [
      "REVIEW",
      [
        ["Dashboard", "◫"],
        ["Director Review Queue", "▤"],
        ["Reviewed Requests", "✓"],
      ],
    ],
    ["ACCOUNT", [["Profile", "○"]]],
  ],
  DEO: [
    [
      "ATTENDANCE",
      [
        ["Dashboard", "◫"],
        ["Attendance Queue", "▤"],
        ["Attendance History", "✓"],
      ],
    ],
    ["ACCOUNT", [["Profile", "○"]]],
  ],
  Admin: [
    ["ACCOUNT", [["Dashboard", "◫"], ["Profile", "○"]]],
  ],
};
// Shared labels and UI helpers.
function who() {
  return currentUser?.name || people[role]?.[0] || "Administrator";
}
function mine() {
  if (role === "Student")
    return data.requests.filter((r) => r.student === who());
  if (role === "Event Coordinator")
    return data.requests.filter((r) => r.type === "Inter-college");
  if (role === "Class In-charge")
    return data.requests.filter((r) => r.status === "Pending Class In-charge");
  if (role === "Department Coordinator")
    return data.requests.filter(
      (r) => r.status === "Pending Department Coordinator",
    );
  if (role === "Director")
    return data.requests.filter((r) => r.status === "Pending Director");
  return data.requests.filter((r) => r.status === "Pending DEO");
}
function badge(s) {
  let c =
    s === "Rejected"
      ? "rejected"
      : s === "Returned for Correction"
        ? "returned"
        : s === "Attendance Recorded"
          ? "done"
          : s.startsWith("Pending") || s === "Awaiting Certificate"
            ? "pending"
            : "neutral";
  return `<span class="badge ${c}">${esc(s)}</span>`;
}
