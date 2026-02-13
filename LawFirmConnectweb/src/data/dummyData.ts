export const dummyCases = [
  {
    _id: "1",
    title: "Estate Planning for Johnson Family",
    description:
      "Comprehensive estate planning including will and trust creation.",
    status: "Open",
    documents: [
      {
        name: "Last_Will_v1.pdf",
        category: "Court Filings",
        date: "2023-11-01T10:00:00Z",
        size: "2.4 MB",
        uploadedBy: "Jane Doe",
      },
      {
        name: "Trust_Deed_Draft.docx",
        category: "Drafts",
        date: "2023-11-02T14:30:00Z",
        size: "1.1 MB",
        uploadedBy: "John Smith",
      },
      {
        name: "Client_Email_Thread.pdf",
        category: "Correspondence",
        date: "2023-10-25T09:15:00Z",
        size: "0.5 MB",
        uploadedBy: "Jane Doe",
      },
    ],
    lawyerId: "L1",
    clientName: "Robert Johnson",
    createdAt: "2023-11-01T10:00:00Z",
    updatedAt: "2023-12-01T14:30:00Z",
  },
  {
    _id: "2",
    title: "Smith vs. Doe Civil Litigation",
    description:
      "Representation in civil dispute regarding property boundaries.",
    status: "Open",
    documents: [
      {
        name: "Property_Map.png",
        category: "Evidence",
        date: "2023-09-15T09:00:00Z",
        size: "15.4 MB",
        uploadedBy: "Client",
      },
      {
        name: "Complaint_Filed.pdf",
        category: "Court Filings",
        date: "2023-09-20T11:00:00Z",
        size: "3.2 MB",
        uploadedBy: "Jane Doe",
      },
    ],
    lawyerId: "L1",
    clientName: "Jane Smith",
    createdAt: "2023-09-15T09:00:00Z",
    updatedAt: "2023-11-20T11:00:00Z",
  },
  {
    _id: "3",
    title: "TechCorp Merger Consultation",
    description: "Legal advisory for potential merger with StartupInc.",
    status: "Closed",
    documents: [
      {
        name: "Merger_Agreement_Final.pdf",
        category: "Court Filings",
        date: "2023-06-30T17:00:00Z",
        size: "5.6 MB",
        uploadedBy: "Jane Doe",
      },
    ],
    lawyerId: "L2",
    clientName: "TechCorp Inc.",
    createdAt: "2023-01-10T08:00:00Z",
    updatedAt: "2023-06-30T17:00:00Z",
  },
  {
    _id: "4",
    title: "Personal Injury Claim",
    description:
      "Assistance with insurance claim following clear car accident.",
    status: "Open",
    documents: [],
    lawyerId: null,
    clientName: "Michael Brown",
    createdAt: "2023-12-05T12:00:00Z",
    updatedAt: "2023-12-10T09:00:00Z",
  },
  {
    _id: "5",
    title: "Family Law Mediation",
    description: "Divorce mediation sessions and custody agreement drafting.",
    status: "Closed",
    documents: [
      {
        name: "Mediation_Notes.pdf",
        category: "Drafts",
        date: "2023-08-15T16:00:00Z",
        size: "1.2 MB",
        uploadedBy: "Sarah Connor",
      },
    ],
    lawyerId: "L3",
    clientName: "Sarah Connor",
    createdAt: "2023-05-20T11:00:00Z",
    updatedAt: "2023-08-15T16:00:00Z",
  },
];

export const dummyMessages = [
  {
    id: 1,
    sender: "Marcus Thorne",
    avatar: "", // Add placeholder if needed
    content:
      "Please review the attached documents for the Johnson estate case.",
    time: "10:30 AM",
    count: 2,
    read: false,
    caseId: "1",
  },
  {
    id: 2,
    sender: "Legal Team",
    avatar: "",
    content: "Your court date has been scheduled for next Tuesday.",
    time: "Yesterday",
    count: 0,
    read: true,
    caseId: "2",
  },
  {
    id: 3,
    sender: "Sarah Jenkins",
    avatar: "",
    content: "Can we reschedule our meeting?",
    time: "Oct 24",
    count: 1,
    read: false,
    caseId: "5",
  },
];

export const dummyCalendarEvents = [
  {
    id: 1,
    title: "Court Hearing - Smith vs Doe",
    date: "2023-12-28", // YYYY-MM-DD
    time: "09:00 AM",
    type: "Court",
    status: "Confirmed",
    caseId: "2",
  },
  {
    id: 2,
    title: "Client Meeting - Johnson Estate",
    date: "2023-12-29",
    time: "02:00 PM",
    type: "Meeting",
    status: "Pending",
    caseId: "1",
  },
  {
    id: 3,
    title: "Document Filing Deadline",
    date: "2023-12-30",
    time: "05:00 PM",
    type: "Deadline",
    status: "Confirmed",
    caseId: "1",
  },
];

export const dummyBilling = [
  {
    id: "INV-001",
    date: "2023-11-15",
    description: "Legal Consultation Hours",
    amount: 450.0,
    status: "Paid",
    caseId: "1",
  },
  {
    id: "INV-002",
    date: "2023-12-01",
    description: "Document Preparation Fee",
    amount: 200.0,
    status: "Pending",
    caseId: "2",
  },
  {
    id: "INV-003",
    date: "2023-12-10",
    description: "Court Filing Fees",
    amount: 150.0,
    status: "Pending",
    caseId: "2",
  },
  {
    id: "INV-004",
    date: "2023-06-25",
    description: "Final Settlement Services",
    amount: 1200.0,
    status: "Paid",
    caseId: "3",
  },
];
