import { Database, DatabaseSchema, roles } from "../src/domain/model";

/**
 * Isolated unit test fixtures for vitest suite only.
 * Used exclusively to test domain permission boundaries and financial math in automated tests.
 */
export function createTestFixture(): Database {
  const schools = [
    {
      id: "cedar",
      name: "Cedar Grove School",
      short: "CG",
      color: "#0f172a",
      address: "14 Admiralty Way, Lekki, Lagos",
      term: "First term · 2026/27",
      motto: "Excellence, Character & Global Leadership",
      coverPhoto:
        "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80",
      openTime: "07:30",
      closeTime: "15:30",
    },
    {
      id: "horizon",
      name: "Horizon Academy",
      short: "HA",
      color: "#24594b",
      address: "8 Gana Street, Maitama, Abuja",
      term: "First term · 2026/27",
      motto: "Nurturing Tomorrow's Pioneers",
      coverPhoto:
        "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
      openTime: "07:45",
      closeTime: "15:30",
    },
    {
      id: "royal",
      name: "Royal Springs College",
      short: "RS",
      color: "#633e67",
      address: "21 Ring Road, Ibadan",
      term: "First term · 2026/27",
      motto: "Integrity, Knowledge & Service",
      coverPhoto:
        "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
      openTime: "07:30",
      closeTime: "15:00",
    },
  ];
  const db: Database = {
    version: 1,
    schools,
    memberships: [],
    students: [],
    staff: [],
    invoices: [],
    payments: [],
    payroll: [],
    attendance: [],
    lessons: [],
    leaves: [],
    studentAttendance: [],
    notices: [],
    classes: [],
    calendar: [],
  };
  for (const [index, school] of schools.entries()) {
    const s = school.id;
    for (const role of roles) {
      const userId = "demo-" + role;
      const name = {
        parent: "Ada Okafor",
        teacher: "Tomi Adebayo",
        staff: "Musa Bello",
        finance: "Ngozi Eze",
        hr: "Funke Adeyemi",
        admin: "Chidi Nwosu",
        owner: "Ifeoma Okeke",
      }[role];
      if (!(s === "royal" && role === "parent"))
        db.memberships.push({
          schoolId: s,
          userId,
          name,
          roles:
            role === "teacher" && s === "cedar" ? ["teacher", "staff"] : [role],
        });
      if (role !== "parent")
        db.staff.push({
          id: s + "-STF-00" + roles.indexOf(role),
          schoolId: s,
          userId,
          name,
          title: role === "teacher" ? "Class teacher · Primary 4" : role,
          email: role + "@example.invalid",
          role,
          rank:
            role === "owner"
              ? "Proprietor & Chancellor"
              : role === "admin"
                ? "Vice Principal · Grade 1"
                : role === "finance"
                  ? "Chief Bursar & Treasury Head"
                  : role === "hr"
                    ? "Head of Faculty HR"
                    : role === "teacher"
                      ? "Senior Educator · Level 4"
                      : "Administrative Officer",
          status: "active",
        });
    }
    for (const staff of db.staff.filter((row) => row.schoolId === s)) {
      db.payroll.push({
        id: s + "-PAY-" + staff.userId,
        schoolId: s,
        userId: staff.userId,
        period: "October 2026",
        basic: 18000000,
        allowances: 2500000,
        deductions: 1500000,
        status: "Draft",
      });
    }
    db.memberships.push({
      schoolId: s,
      userId: "demo-empty",
      name: "New guardian",
      roles: ["parent"],
    });
    ["Chinonso Okafor", "Amara Okafor", "Yusuf Ibrahim"].forEach((name, n) => {
      const id = s + "-STU-00" + (n + 1);
      db.students.push({
        id,
        schoolId: s,
        name:
          index === 0
            ? name
            : name.replace("Okafor", index === 1 ? "Balogun" : "Adeyemi"),
        className: ["Primary 4 · Oak", "Nursery 2 · Sunflower", "JSS 2 · A"][
          n
        ]!,
        guardianId: n < 2 ? "demo-parent" : "other-parent",
      });
      db.invoices.push({
        id: s + "-INV-10" + n,
        schoolId: s,
        studentId: id,
        due: n === 0 ? "2026-09-28" : "2027-01-15",
        items: [
          { label: "Tuition", amount: 9500000 + index * 1000000 },
          { label: "Learning materials", amount: 1500000 },
          { label: "School meals", amount: 2000000 },
        ],
        paid: n === 0 ? 5000000 : n === 1 ? 13000000 + index * 1000000 : 0,
      });
    });
    db.invoices.push({
      id: s + "-INV-200",
      schoolId: s,
      studentId: s + "-STU-001",
      due: "2027-01-15",
      items: [
        { label: "Optional school transport · next term", amount: 3500000 },
      ],
      paid: 1500000,
    });
    db.payments.push({
      id: s + "-RCT-001",
      schoolId: s,
      userId: "demo-parent",
      invoiceIds: [s + "-INV-100"],
      amount: 5000000,
      method: "card",
      state: "settled",
      createdAt: "2026-09-10T10:00:00.000Z",
      key: s + "-seed",
    });
    db.attendance.push({
      id: s + "-ATT-1",
      schoolId: s,
      userId: "demo-teacher",
      inAt: "2026-10-22T06:42:00Z",
      outAt: "2026-10-22T14:35:00Z",
      state: "Demo verified",
    });
    db.leaves.push({
      id: s + "-LEV-1",
      schoolId: s,
      userId: "demo-teacher",
      type: "Annual",
      start: "2026-10-19",
      end: "2026-10-20",
      reason: "Family event during assessment week",
      status: "Rejected",
    });
    db.lessons.push({
      id: s + "-LES-1",
      schoolId: s,
      userId: "demo-teacher",
      subject: "Mathematics",
      className: "Primary 4",
      topic: "Equivalent fractions",
      date: "2026-10-26",
      objectives: "Identify equivalent fractions using visual models.",
      content:
        "Begin with paper folding. Compare halves and quarters, then work through examples in pairs.",
      status: "Saved on device",
    });
    db.notices.push(
      {
        id: s + "-N1",
        schoolId: s,
        title: "Mid-term break begins Friday",
        body: "School closes at 1 pm. Classes resume Monday, 2 November. Please arrange pickup.",
        at: "2026-10-23T09:00:00Z",
        read: false,
        target: "home",
      },
      {
        id: s + "-N2",
        schoolId: s,
        userId: "demo-parent",
        title: "Chinonso’s tuition balance is due",
        body: "Review the fee breakdown and available demo payment options.",
        at: "2026-10-22T08:00:00Z",
        read: false,
        target: "fees",
        recordId: s + "-STU-001",
      },
    );
    db.classes?.push(
      {
        id: s + "-CLS-P1",
        schoolId: s,
        name: "Primary 1 Gold",
        code: "PR1-G",
        termFee: 15000000,
        studentCount: 18,
      },
      {
        id: s + "-CLS-P2",
        schoolId: s,
        name: "Primary 2 Emerald",
        code: "PR2-E",
        termFee: 15000000,
        studentCount: 20,
      },
      {
        id: s + "-CLS-P4",
        schoolId: s,
        name: "Primary 4 Diamond",
        code: "PR4-D",
        teacherUserId: "demo-teacher",
        termFee: 18000000,
        studentCount: 24,
      },
      {
        id: s + "-CLS-J1",
        schoolId: s,
        name: "JSS 1 Sapphire",
        code: "JSS1-S",
        termFee: 22000000,
        studentCount: 22,
      },
      {
        id: s + "-CLS-S1",
        schoolId: s,
        name: "SSS 1 Titanium",
        code: "SSS1-T",
        termFee: 26000000,
        studentCount: 19,
      },
    );
    db.calendar?.push(
      {
        id: s + "-CAL-01",
        schoolId: s,
        title: "First Term Resumption",
        date: "2026-09-14",
        type: "term",
        description: "Official resumption for 2026/2027 Academic Session",
        source: "Lagos State Ministry of Education",
      },
      {
        id: s + "-CAL-02",
        schoolId: s,
        title: "National Independence Day Holiday",
        date: "2026-10-01",
        type: "holiday",
        description: "Federal Public Holiday - School Closed",
        source: "Federal Republic of Nigeria",
      },
      {
        id: s + "-CAL-03",
        schoolId: s,
        title: "Mid-Term Open Day & Parent Conferences",
        date: "2026-10-23",
        type: "event",
        description: "Review academic progress, attendance and term assessments with class teachers",
        source: "School Management",
      },
      {
        id: s + "-CAL-04",
        schoolId: s,
        title: "First Term Mid-Term Break",
        date: "2026-10-24",
        endDate: "2026-11-01",
        type: "break",
        description: "Approved Mid-Term Break for all basic and secondary schools",
        source: "Ministry of Education Circular",
      },
      {
        id: s + "-CAL-05",
        schoolId: s,
        title: "First Term Unified Examinations",
        date: "2026-12-01",
        endDate: "2026-12-11",
        type: "exam",
        description: "Standardized Term End Examinations across all grade levels",
        source: "Academic Board & State MOE",
      },
      {
        id: s + "-CAL-06",
        schoolId: s,
        title: "End of Term Vacation & Carol Service",
        date: "2026-12-18",
        type: "term",
        description: "Vacation begins. Second term resumes 11 January 2027",
        source: "School Management",
      },
    );
  }
  return DatabaseSchema.parse(db);
}
