/**
 * Kevin Ortiz Portfolio — content constants
 * Mirrors data.jsx from the design handoff.
 */

export interface ProfileStat { v: string; l: string; }
export interface ProfileQuick { lbl: string; val: string; }
export interface Profile {
  name: string;
  initials: string;
  title: string;
  longTitle: string;
  tagline: string;
  bioShort: string;
  bioLong: string[];
  location: string;
  email: string;
  github: string;
  linkedin: string;
  available: boolean;
  stats: ProfileStat[];
  quick: ProfileQuick[];
}

export interface Experience {
  role: string;
  company: string;
  period: string;
  duration: string;
  current: boolean;
  points: string[];
  stack: string[];
}

export interface SkillItem { name: string; years: number; level: number; }
export interface SkillGroup { id: string; name: string; items: SkillItem[]; }

export type ProjectLinkKind = 'view' | 'code' | 'live' | 'case';
export interface ProjectLink {
  label: string;
  kind: ProjectLinkKind;
  primary?: boolean;
  href?: string;
}
export interface ProjectViewer {
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  hdrPath?: string;
}
export interface Project {
  id: string;
  name: string;
  tag: string;
  type: '3d';
  desc: string;
  accent: string;
  model: string;
  links: ProjectLink[];
  viewer?: ProjectViewer;
}

export const PROFILE: Profile = {
  name: 'Kevin Ortiz',
  initials: 'KO',
  title: 'Quality Assurance & DevOps Engineer',
  longTitle: 'Software Engineer · QA · DevOps',
  tagline: 'Engineer building reliable systems —\nand the occasional 3D world.',
  bioShort:
    'QA & DevOps engineer with a software development backbone. I lead testing across cross-functional Agile teams and ship resilient cloud infrastructure — Docker, Kubernetes, Terraform, Jenkins, Azure.',
  bioLong: [
    "I'm a detail-oriented Quality Assurance Engineer with a robust background in software testing, DevOps, cloud infrastructure, and full-stack development. I lead QA teams and collaborate across cross-functional Agile environments, driving quality and efficiency through both manual and automated testing.",
    "Hands-on experience with Selenium, Playwright, TestNG, Cucumber, plus Docker, Kubernetes, Terraform, Jenkins, and Azure. I've delivered containerized applications, scalable cloud solutions, and automated infrastructure deployments. My QA leadership at FDM Group and analytical contributions at TD Bank reflect strong technical insight and effective communication.",
    'U.S. Navy veteran and SUNY Maritime graduate. Continuously upskilling in Salesforce, Java, Python, React, and mobile testing platforms — and committed to integrating AI/ML and modern DevOps practices into solutions that deliver real-world impact.',
  ],
  location: 'New York, NY',
  email: 'kevin.ortiz.software@gmail.com',
  github: 'kevinortiz43',
  linkedin: 'kevino73',
  available: true,
  stats: [
    { v: '5+', l: 'Years Eng' },
    { v: '20+', l: 'Projects' },
    { v: '3', l: 'Disciplines' },
  ],
  quick: [
    { lbl: 'Currently', val: 'DevOps Engineer' },
    { lbl: 'Open to', val: 'Full-time, contract' },
    { lbl: 'Education', val: 'B.Sc. SUNY Maritime' },
    { lbl: 'Background', val: 'U.S. Navy Veteran' },
  ],
};

export const EXPERIENCE: Experience[] = [
  {
    role: 'DevOps Engineer',
    company: 'Current Role',
    period: '2026 — Present',
    duration: '3+ months',
    current: true,
    points: [
      'Building automated infrastructure deployments with Terraform across cloud environments',
      'Maintaining CI/CD pipelines using GitHub Actions and Jenkins for production releases',
      'Containerizing legacy services with Docker and orchestrating with Kubernetes',
    ],
    stack: ['Terraform', 'Kubernetes', 'Docker', 'GitHub Actions', 'Azure', 'Jenkins'],
  },
  {
    role: 'Quality Assurance Engineer',
    company: 'FDM Group · TD Bank (Consultant)',
    period: '2023 — 2026',
    duration: '2+ years',
    current: false,
    points: [
      'Led QA across cross-functional Agile teams, driving quality in both manual and automated testing',
      'Built end-to-end test suites with Selenium, Playwright, TestNG, and Cucumber covering critical banking flows',
      'Performed ADA / accessibility compliance testing and authored regression strategy',
      'Mentored junior testers and authored internal QA documentation on Confluence',
    ],
    stack: ['Selenium', 'Playwright', 'TestNG', 'Cucumber', 'Java', 'Jira', 'BrowserStack'],
  },
  {
    role: 'Software Developer',
    company: 'Multi-disciplinary',
    period: '2021 — 2023',
    duration: '3+ years (cumulative)',
    current: false,
    points: [
      'Built full-stack features in React, Angular, and Spring across mobile and web platforms',
      'Designed and shipped Salesforce admin/developer customizations for enterprise clients',
      'Worked with MongoDB, MySQL, and TensorFlow on data-driven application features',
    ],
    stack: ['React', 'Angular', 'Spring', 'Salesforce', 'MongoDB', 'Python', 'TensorFlow'],
  },
  {
    role: 'U.S. Navy',
    company: 'Service Member · Veteran',
    period: 'Prior',
    duration: 'Foundation in leadership & discipline',
    current: false,
    points: [
      'Built a foundation in leadership, teamwork, and operational discipline',
      'B.Sc. in Marine Environmental Science — SUNY Maritime College',
    ],
    stack: ['Leadership', 'Operations', 'Teamwork'],
  },
];

export const SKILL_GROUPS: SkillGroup[] = [
  {
    id: 'languages',
    name: 'Languages',
    items: [
      { name: 'JavaScript', years: 5, level: 0.9 },
      { name: 'TypeScript', years: 4, level: 0.85 },
      { name: 'Python', years: 4, level: 0.8 },
      { name: 'Java', years: 3, level: 0.78 },
      { name: 'SQL', years: 4, level: 0.85 },
      { name: 'HTML5 / CSS3', years: 6, level: 0.95 },
    ],
  },
  {
    id: 'frameworks',
    name: 'Frameworks',
    items: [
      { name: 'React', years: 4, level: 0.9 },
      { name: 'Angular', years: 3, level: 0.82 },
      { name: 'Spring', years: 2, level: 0.7 },
      { name: 'Salesforce Admin/Dev', years: 2, level: 0.72 },
      { name: 'Three.js', years: 2, level: 0.7 },
    ],
  },
  {
    id: 'devops',
    name: 'DevOps',
    items: [
      { name: 'Docker', years: 3, level: 0.88 },
      { name: 'Kubernetes', years: 2, level: 0.75 },
      { name: 'Terraform', years: 2, level: 0.78 },
      { name: 'GitHub Actions', years: 3, level: 0.85 },
      { name: 'Jenkins', years: 2, level: 0.75 },
      { name: 'Unix / Bash', years: 5, level: 0.85 },
    ],
  },
  {
    id: 'testing',
    name: 'Testing',
    items: [
      { name: 'Selenium', years: 3, level: 0.92 },
      { name: 'Playwright', years: 2, level: 0.85 },
      { name: 'TestNG / JUnit', years: 3, level: 0.88 },
      { name: 'Appium', years: 2, level: 0.7 },
      { name: 'ADA / a11y testing', years: 2, level: 0.8 },
    ],
  },
  {
    id: 'data',
    name: 'Data & Cloud',
    items: [
      { name: 'Azure', years: 2, level: 0.75 },
      { name: 'MongoDB', years: 3, level: 0.78 },
      { name: 'MySQL', years: 4, level: 0.82 },
      { name: 'TensorFlow', years: 1, level: 0.55 },
    ],
  },
  {
    id: 'creative',
    name: 'Creative / 3D',
    items: [
      { name: 'Blender', years: 3, level: 0.78 },
      { name: 'Three.js / WebGL', years: 2, level: 0.7 },
      { name: 'GLSL shaders', years: 1, level: 0.5 },
    ],
  },
];

  export const PROJECTS: Project[] = [
    {
      id: 'snowman',
      name: 'Snowman',
      tag: 'Blender · glTF',
      type: '3d',
      desc: 'Stylized winter scene rendered with HDRI environment lighting. Modeled and textured in Blender, exported to glTF, and shipped to the browser via Three.js.',
      accent: '#5ee0c4',
      model: 'snowman',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: 1, cameraZ: 4, hdrPath: 'snowy_hillside_1k' },
    },
    {
      id: 'shark',
      name: 'Shark',
      tag: 'Blender · Sculpt · glTF',
      type: '3d',
      desc: 'Sub-surface modeled shark with subdivision smoothing and procedural materials. Studied form and silhouette while practicing topology.',
      accent: '#6fa8ff',
      model: 'shark',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: 0, cameraZ: 3.1 },
    },
    {
      id: 'scifi-crate',
      name: 'Sci-Fi Crate',
      tag: 'Blender · PBR · glTF',
      type: '3d',
      desc: 'Hard-surface sci-fi crate with PBR materials and emissive panels. Rendered in a soft sky HDRI to play with reflections on the metallic body.',
      accent: '#d3ff5b',
      model: 'scifiCrate',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: 1, cameraZ: 4, hdrPath: 'industrial_sunset_puresky_1k' },
    },
    {
      id: 'gladius',
      name: 'Gladius',
      tag: 'Blender · Hard Surface · glTF',
      type: '3d',
      desc: 'Roman-inspired sword with a stylized engraved blade. Studied edge-flow and material layering — steel, wood grip, gold pommel.',
      accent: '#a87bff',
      model: 'TOC_Gladius',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: -1.5, cameraZ: 6.5, hdrPath: 'industrial_sunset_puresky_1k' },
    },
    {
      id: 'arc-lance',
      name: 'Arc Lance',
      tag: 'Blender · Weapon · glTF',
      type: '3d',
      desc: 'Energy lance with glowing elements. Modeled in Blender with emissive materials and particle effects.',
      accent: '#f5b14c',
      model: 'Arc_Lance',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: 0, cameraZ: 3, hdrPath: 'industrial_sunset_puresky_1k' },
    },
    {
      id: 'enclave-general',
      name: 'Enclave General',
      tag: 'Blender · Character · glTF',
      type: '3d',
      desc: 'Warhammer 40K Enclave general with detailed armor and weapon. Rigged for animation in Blender.',
      accent: '#a87bff',
      model: 'Enclave_General_source',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: 0, cameraZ: 3.5, hdrPath: 'industrial_sunset_puresky_1k' },
    },
    {
      id: 'hard-drive',
      name: 'Hard Drive',
      tag: 'Blender · Tech · glTF',
      type: '3d',
      desc: 'Retro hard drive model with accurate internals. Great exercise in hard-surface modeling.',
      accent: '#6fa8ff',
      model: 'hardDrive',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: 0, cameraZ: 3, hdrPath: 'industrial_sunset_puresky_1k' },
    },
    {
      id: 'm89-thurgood',
      name: 'M89 Thurgood',
      tag: 'Blender · Sci-Fi · glTF',
      type: '3d',
      desc: 'Sci-fi rifle with scope and tactical rails. Modeled with attention to mechanical detail.',
      accent: '#5ee0c4',
      model: 'M89Thurgood',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: 0, cameraZ: 3.5, hdrPath: 'industrial_sunset_puresky_1k' },
    },
    {
      id: 'secutarii-backpack',
      name: 'Secutarii Backpack',
      tag: 'Blender · Gear · glTF',
      type: '3d',
      desc: 'Warhammer 40K backpack with pipes and cables. Practiced organic-mechanical hybrid modeling.',
      accent: '#d3ff5b',
      model: 'Secutarii_Backpack',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: 0, cameraZ: 3, hdrPath: 'industrial_sunset_puresky_1k' },
    },
    {
      id: 'secutarii-helmet',
      name: 'Secutarii Helmet',
      tag: 'Blender · Armor · glTF',
      type: '3d',
      desc: 'Warhammer 40K helmet with crest and vents. Focused on edge flow and hard-surface techniques.',
      accent: '#a87bff',
      model: 'Secutarii_HelmetV2blend',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: 0, cameraZ: 3, hdrPath: 'industrial_sunset_puresky_1k' },
    },
    {
      id: 'sollex-axe',
      name: 'Sollex Power Axe',
      tag: 'Blender · Weapon · glTF',
      type: '3d',
      desc: 'Warhammer 40K power axe with energy head. Modeled glowing effects using Blender emissive materials.',
      accent: '#5ee0c4',
      model: 'Sollex_Power_Axe',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: 0, cameraZ: 3, hdrPath: 'industrial_sunset_puresky_1k' },
    },
    {
      id: 'toc-gladius',
      name: 'TOC Gladius',
      tag: 'Blender · Sword · glTF',
      type: '3d',
      desc: 'Roman-inspired TOC gladius with engraved blade. Studied edge-flow and material layering.',
      accent: '#d3ff5b',
      model: 'TOC_Gladius',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: -1.5, cameraZ: 6.5, hdrPath: 'industrial_sunset_puresky_1k' },
    },
    {
      id: 'toc-human-power',
      name: 'TOC Human Power Gladius',
      tag: 'Blender · Sword · glTF',
      type: '3d',
      desc: 'Human-powered variant with custom grip and pommel detail. Extended the TOC series with new design elements.',
      accent: '#6fa8ff',
      model: 'TOC_Human_Power_Gladius',
      links: [
        { label: 'View 3D', primary: true, kind: 'view' },
        { label: 'Source', kind: 'code' },
      ],
      viewer: { cameraX: 0, cameraY: -1.5, cameraZ: 6.5, hdrPath: 'industrial_sunset_puresky_1k' },
    },
  ];


  