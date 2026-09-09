import type { Task, TaskStatus, Priority } from "../tasks/domain/task";

export const MEMBERS = [
  {
    id: "alex",
    name: "Alex Morgan",
    role: "Product designer",
    initials: "AM",
    color: "peach",
    team: "Design",
    email: "alex@studio.co",
  },
  {
    id: "sarah",
    name: "Sarah Chen",
    role: "Design lead",
    initials: "SC",
    color: "purple",
    team: "Design",
    email: "sarah@studio.co",
  },
  {
    id: "james",
    name: "James Wilson",
    role: "Frontend engineer",
    initials: "JW",
    color: "blue",
    team: "Engineering",
    email: "james@studio.co",
  },
  {
    id: "mia",
    name: "Mia Johnson",
    role: "Content strategist",
    initials: "MJ",
    color: "pink",
    team: "Marketing",
    email: "mia@studio.co",
  },
  {
    id: "leo",
    name: "Leo Park",
    role: "Product manager",
    initials: "LP",
    color: "green",
    team: "Product",
    email: "leo@studio.co",
  },
];

export const PROJECTS = [
  {
    id: "website",
    name: "Website redesign",
    description: "A fresh foundation for a better digital experience.",
    color: "purple",
    icon: "website",
    due: "Sep 25, 2026",
    team: "Design & Engineering",
  },
  {
    id: "mobile",
    name: "Mobile app",
    description: "Thoughtful experiences, wherever life takes you.",
    color: "blue",
    icon: "mobile",
    due: "Oct 12, 2026",
    team: "Product & Engineering",
  },
  {
    id: "system",
    name: "Design system",
    description: "One shared language. Endless possibilities.",
    color: "peach",
    icon: "system",
    due: "Sep 30, 2026",
    team: "Design",
  },
];

export const TAG_COLORS: Record<string, string> = {
  Design: "purple",
  Research: "pink",
  Development: "blue",
  Content: "orange",
  Strategy: "green",
  Branding: "pink",
  UX: "blue",
  Marketing: "orange",
};

type Seed = [
  string,
  string,
  TaskStatus,
  Priority,
  string[],
  string,
  number,
  Task["cover"]?,
];
const seeds: Seed[] = [
  [
    "ORB-101",
    "Explore dashboard concepts",
    "backlog",
    "normal",
    ["Design", "UX"],
    "alex",
    18,
  ],
  [
    "ORB-102",
    "Audit existing website",
    "backlog",
    "high",
    ["Research"],
    "sarah",
    16,
  ],
  [
    "ORB-103",
    "Define content strategy",
    "backlog",
    "normal",
    ["Content", "Strategy"],
    "mia",
    20,
  ],
  [
    "ORB-104",
    "Design homepage experience",
    "progress",
    "high",
    ["Design"],
    "alex",
    15,
    "website",
  ],
  [
    "ORB-105",
    "Build component library",
    "progress",
    "high",
    ["Development"],
    "james",
    18,
  ],
  [
    "ORB-106",
    "Map the user journey",
    "progress",
    "normal",
    ["Research", "UX"],
    "sarah",
    17,
  ],
  [
    "ORB-107",
    "Refresh brand color palette",
    "review",
    "normal",
    ["Branding"],
    "alex",
    14,
    "palette",
  ],
  [
    "ORB-108",
    "Review navigation structure",
    "review",
    "high",
    ["UX", "Design"],
    "leo",
    15,
  ],
  [
    "ORB-109",
    "Write landing page copy",
    "review",
    "low",
    ["Content"],
    "mia",
    16,
  ],
  [
    "ORB-110",
    "Project kickoff & alignment",
    "done",
    "normal",
    ["Strategy"],
    "leo",
    8,
  ],
  [
    "ORB-111",
    "Gather stakeholder feedback",
    "done",
    "normal",
    ["Research"],
    "sarah",
    9,
  ],
  [
    "ORB-112",
    "Create inspiration moodboard",
    "done",
    "low",
    ["Design"],
    "alex",
    10,
  ],
];

export const INITIAL_TASKS: Task[] = seeds
  .map<Task>(
    ([id, title, status, priority, tags, assigneeId, day, cover], index) => ({
      id,
      title,
      status,
      priority,
      tags,
      assigneeId,
      cover,
      projectId: "website",
      rank: index * 1024,
      startOn: `2026-09-${String(Math.max(7, day - 5)).padStart(2, "0")}`,
      dueOn: `2026-09-${String(day).padStart(2, "0")}`,
      description: `${title} for the website redesign.\n\nFocus on a clear, accessible experience that brings our new direction to life. Document your decisions and share the work with the team for feedback.`,
      subtasks:
        index % 3 === 0
          ? [
              {
                id: `${id}-1`,
                title: "Gather references and requirements",
                done: true,
              },
              {
                id: `${id}-2`,
                title: "Create the first iteration",
                done: status !== "backlog",
              },
              {
                id: `${id}-3`,
                title: "Review with the team",
                done: status === "done",
              },
              {
                id: `${id}-4`,
                title: "Polish and hand off",
                done: status === "done",
              },
            ]
          : [],
      comments:
        index % 2 === 0
          ? [
              {
                id: `${id}-c1`,
                authorId: "sarah",
                body: "The direction is looking good. Let’s keep accessibility in mind as we explore this.",
                createdAt: "2026-09-09T09:30:00Z",
              },
            ]
          : [],
      updatedAt: 1,
      actor: "seed",
    }),
  )
  .concat([
    {
      ...makeTask(
        "MOB-201",
        "Prototype the onboarding flow",
        "mobile",
        "progress",
        "sarah",
      ),
      tags: ["Design", "UX"],
    },
    {
      ...makeTask(
        "MOB-202",
        "Set up app navigation",
        "mobile",
        "backlog",
        "james",
      ),
      tags: ["Development"],
    },
    {
      ...makeTask(
        "MOB-203",
        "Research notification preferences",
        "mobile",
        "review",
        "leo",
      ),
      tags: ["Research"],
    },
    {
      ...makeTask(
        "SYS-301",
        "Document button variants",
        "system",
        "progress",
        "alex",
      ),
      tags: ["Design"],
    },
    {
      ...makeTask(
        "SYS-302",
        "Publish spacing tokens",
        "system",
        "done",
        "james",
      ),
      tags: ["Development"],
    },
    {
      ...makeTask(
        "SYS-303",
        "Audit component accessibility",
        "system",
        "backlog",
        "sarah",
      ),
      tags: ["UX"],
    },
  ]);

function makeTask(
  id: string,
  title: string,
  projectId: string,
  status: TaskStatus,
  assigneeId: string,
): Task {
  return {
    id,
    title,
    projectId,
    status,
    assigneeId,
    description:
      "Bring a thoughtful, consistent experience to every interaction.",
    priority: "normal",
    tags: [],
    startOn: "2026-09-10",
    dueOn: "2026-09-22",
    rank: Number(id.slice(-3)) * 1024,
    subtasks: [],
    comments: [],
    updatedAt: 1,
    actor: "seed",
  };
}
