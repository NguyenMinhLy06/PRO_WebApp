/* PRO192 — Java OOP Learning Platform (static export)
   Vanilla-JS re-implementation of the original Vite/TS + Spring Boot app.
   All data (modules, lessons, resources) is embedded in data.js so this
   works straight from the filesystem — no build step, no backend server. */

(function () {
  "use strict";

  const DATA = window.__DATA__;
  const MODULES = [...DATA.modules].sort((a, b) => a.order - b.order);
  const LESSONS = DATA.lessons;
  const RESOURCES = DATA.resources;

  const LESSON_ORDER = MODULES.flatMap((m) => m.lessonSlugs);
  const lessonBySlug = new Map(LESSONS.map((l) => [l.slug, l]));

  // Filenames that actually exist under files/ in this export. Anything not
  // listed here (e.g. the workshop PDFs) is shown as unavailable instead of
  // linking to a 404.
  const AVAILABLE_FILES = new Set([
    "Introduction.pdf",
    "Learning_the_Java_Language.pdf",
    "Exception_Handling.pdf",
    "Memory_Management_in_Java.pdf",
    "Encapsulation.pdf",
    "Inheritance.pdf",
    "Polymorphism.pdf",
    "ArrayOfObjects.pdf",
    "File_IO.pdf",
    "Collections.pdf",
    "Download___Install_JDK___NetBeans_8.pdf",
    "Get_Start.pdf",
    "Numbers_and_Strings.pdf",
    "Support_Classes.pdf",
    "workshop1.pdf",
    "workshop2.pdf",
    "workshop3.pdf",
    "workshop4.pdf",
    "workshop5.pdf",
    "workshop6.pdf",
  ]);

  // ---------- progress (localStorage) ----------
  const PROGRESS_KEY = "pro192_progress";
  function loadProgress() {
    try {
      return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }
  function saveProgress(set) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...set]));
  }
  let completed = loadProgress();
  const progressState = {
    isCompleted: (slug) => completed.has(slug),
    countCompletedIn: (slugs) => slugs.filter((s) => completed.has(s)).length,
    toggle: (slug) => {
      if (completed.has(slug)) completed.delete(slug);
      else completed.add(slug);
      saveProgress(completed);
    },
  };

  // ---------- course data helpers ----------
  const courseData = {
    getModules: () => MODULES,
    getLessons: () => LESSON_ORDER.map((s) => lessonBySlug.get(s)).filter(Boolean),
    getLessonsForModule: (moduleId) => {
      const mod = MODULES.find((m) => m.id === moduleId);
      if (!mod) return [];
      return mod.lessonSlugs.map((s) => lessonBySlug.get(s)).filter(Boolean);
    },
  };

  // ---------- content block renderer ----------
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  let codeBlockCounter = 0;
  function renderBlock(block) {
    switch (block.type) {
      case "heading": {
        const level = Math.min(Math.max(block.level ?? 2, 2), 4);
        const idAttr = block.id ? ` id="${escapeHtml(block.id)}"` : "";
        return `<h${level}${idAttr}>${escapeHtml(block.text)}</h${level}>`;
      }
      case "paragraph":
        return `<p>${escapeHtml(block.text)}</p>`;
      case "list": {
        const tag = block.ordered ? "ol" : "ul";
        const items = (block.items ?? []).map((i) => `<li>${escapeHtml(i)}</li>`).join("");
        return `<${tag}>${items}</${tag}>`;
      }
      case "note":
        return `<div class="note-box"><span class="font-semibold text-accent-dark">Note &middot; </span>${escapeHtml(block.text)}</div>`;
      case "code": {
        const id = `code-${codeBlockCounter++}`;
        return `
          <div class="code-block">
            <button type="button" class="copy-btn" data-action="copy-code" data-target="${id}">Copy</button>
            <pre id="${id}" class="whitespace-pre overflow-x-auto">${escapeHtml(block.text)}</pre>
          </div>`;
      }
      case "image":
        return `<figure><img src="images/${encodeURIComponent(block.src ?? "")}" alt="${escapeHtml(block.alt || "")}" loading="lazy" />${
          block.alt ? `<figcaption class="text-xs text-ink-600 -mt-3 mb-4">${escapeHtml(block.alt)}</figcaption>` : ""
        }</figure>`;
      case "table": {
        const rows = block.rows ?? [];
        if (rows.length === 0) return "";
        const [header, ...body] = rows;
        const thead = `<thead><tr>${header.map((c) => `<th class="border border-black/10 bg-black/5 px-3 py-2 text-left font-semibold">${escapeHtml(c)}</th>`).join("")}</tr></thead>`;
        const tbody = `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td class="border border-black/10 px-3 py-2 align-top">${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
        return `<div class="overflow-x-auto my-5"><table class="w-full border-collapse text-sm">${thead}${tbody}</table></div>`;
      }
      default:
        return "";
    }
  }
  function renderBlocks(blocks) {
    return blocks.map(renderBlock).join("\n");
  }
  function extractOutline(blocks) {
    return blocks
      .filter((b) => b.type === "heading" && b.level === 2 && b.id)
      .map((b) => ({ id: b.id, text: b.text ?? "" }));
  }

  // ---------- sidebar ----------
  function cupIcon(percent) {
    const pct = Math.max(0, Math.min(100, percent));
    const fillHeight = (10 * pct) / 100;
    const fillY = 13 - fillHeight;
    const fillColor = pct >= 100 ? "#2FA97A" : "#E8973A";
    const uid = Math.round(pct) + "-" + Math.random().toString(36).slice(2, 7);
    return `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0">
        <clipPath id="cupclip-${uid}"><rect x="3" y="3" width="10" height="10" rx="1.5"/></clipPath>
        <rect x="3" y="3" width="10" height="10" rx="1.5" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>
        <rect x="3" y="${fillY}" width="10" height="${fillHeight}" rx="1" fill="${fillColor}" opacity="0.9"/>
        <path d="M13 6.5H14.2C15 6.5 15.5 7 15.5 7.8C15.5 8.6 15 9.2 14.2 9.2H13" stroke="rgba(255,255,255,0.35)" stroke-width="1.2" fill="none"/>
      </svg>`;
  }

  const TOP_LINKS = [
    { path: "/", label: "Overview", icon: "M4 10.5 10 4l6 6.5M5.5 9v6.5h9V9" },
    { path: "/roadmap", label: "Roadmap", icon: "M4 5h12M4 10h12M4 15h8" },
    { path: "/workshops", label: "Workshops", icon: "M5 4h10v9l-3 3H5V4z" },
    { path: "/resources", label: "Resources", icon: "M4 4h6l2 2h4v10H4V4z" },
    { path: "/references", label: "References", icon: "M6 4h8v12H6zM6 8h8" },
  ];

  function isActiveLesson(currentPath, slug) {
    return currentPath === `/lessons/${slug}`;
  }

  function renderSidebar(currentPath) {
    const topLinksHtml = TOP_LINKS.map((link) => {
      const active = currentPath === link.path;
      return `
        <a href="#${link.path}" class="nav-link ${active ? "active" : ""}">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${link.icon}"/></svg>
          ${link.label}
        </a>`;
    }).join("");

    const modulesHtml = MODULES.map((mod) => {
      const lessonSlugs = mod.lessonSlugs;
      const donePct = lessonSlugs.length ? (progressState.countCompletedIn(lessonSlugs) / lessonSlugs.length) * 100 : 0;
      const lessonsHtml = courseData
        .getLessonsForModule(mod.id)
        .map((lesson) => {
          const active = isActiveLesson(currentPath, lesson.slug);
          const done = progressState.isCompleted(lesson.slug);
          return `
            <a href="#/lessons/${lesson.slug}" class="nav-link !py-1.5 !pl-8 text-[13px] ${active ? "active" : ""}">
              <span class="w-1.5 h-1.5 rounded-full ${done ? "bg-done" : "bg-white/20"} shrink-0"></span>
              <span class="truncate">${lesson.title}</span>
            </a>`;
        })
        .join("");

      return `
        <div class="mb-1">
          <div class="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/50">
            ${cupIcon(donePct)}
            <span>${mod.title}</span>
          </div>
          ${lessonsHtml}
        </div>`;
    }).join("");

    return `
      <div class="flex flex-col h-full">
        <div class="px-5 pt-6 pb-4">
          <a href="#/" class="flex items-center gap-2.5">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-ink-900 font-display font-bold text-sm">P2</span>
            <div class="leading-tight">
              <div class="font-display font-semibold text-white text-[15px]">PRO192</div>
              <div class="text-[11px] text-white/50">Java OOP</div>
            </div>
          </a>
        </div>
        <nav class="px-3 space-y-0.5">${topLinksHtml}</nav>
        <div class="mt-5 px-3 mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">Course Content</div>
        <nav class="flex-1 overflow-y-auto px-3 pb-6 space-y-0.5">${modulesHtml}</nav>
      </div>`;
  }

  // ---------- pages ----------
  function renderHomePage() {
    return `
      <div class="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <p class="text-accent-dark font-semibold text-sm tracking-wide uppercase mb-3">PRO192</p>
        <h1 class="text-3xl md:text-4xl font-bold mb-4 leading-tight">The Object Oriented Programming using Java</h1>
        <p class="text-ink-700 leading-7 mb-10">
          This subject introduces the student to object-oriented programming. The student learns to build reusable
          objects, encapsulate data and logic within a class, inherit one class from another and implement
          polymorphism. Adhere to object-oriented programming principles including encapsulation, polymorphism and
          inheritance when writing program code.
        </p>

        <div class="card p-6 mb-6">
          <h2 class="text-lg font-semibold mb-4">Learning outcomes</h2>
          <ul class="space-y-2.5 text-[15px] text-ink-700 leading-6">
            <li class="flex gap-2.5"><span class="text-accent mt-1">&#9679;</span>Understand the concepts of object oriented (OO) programs to solve problems and fundamentals of object-oriented programming in Java</li>
            <li class="flex gap-2.5"><span class="text-accent mt-1">&#9679;</span>Practice basic Java language syntax and semantics to write Java programs and use concepts such as variables, conditional and iterative execution methods</li>
            <li class="flex gap-2.5"><span class="text-accent mt-1">&#9679;</span>Use streams to read and write data from/to different types of sources/targets</li>
            <li class="flex gap-2.5"><span class="text-accent mt-1">&#9679;</span>Discuss the benefits and the use of Java's exception handling mechanism</li>
            <li class="flex gap-2.5"><span class="text-accent mt-1">&#9679;</span>Identify classes, objects, members of a class and relationships among them needed for a specific problem</li>
            <li class="flex gap-2.5"><span class="text-accent mt-1">&#9679;</span>Explain the concept and demonstrate the use of Polymorphism, Encapsulation, Abstraction and Inheritance in Java</li>
            <li class="flex gap-2.5"><span class="text-accent mt-1">&#9679;</span>Discuss the principles and the use of abstract classes and interfaces in Java</li>
            <li class="flex gap-2.5"><span class="text-accent mt-1">&#9679;</span>Understand and implement a complete program using object arrays</li>
            <li class="flex gap-2.5"><span class="text-accent mt-1">&#9679;</span>Explain the principles and the use of some Java collections abstract data types (list, set, map)</li>
          </ul>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 mb-6">
          <div class="card p-6">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-ink-600 mb-2">Prerequisite(s)</h2>
            <p class="text-ink-800 font-medium">PRF192</p>
          </div>
          <div class="card p-6">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-ink-600 mb-2">Get Started</h2>
            <a href="#/roadmap" class="btn-primary w-full">View Roadmap &rarr;</a>
          </div>
        </div>

        <div class="card p-6">
          <h2 class="text-lg font-semibold mb-3">Academic policy</h2>
          <p class="text-[15px] text-ink-700 leading-7 mb-3">
            Cheating, plagiarism and breach of copyright are serious offenses under this policy.
          </p>
          <ul class="space-y-2 text-[15px] text-ink-700 leading-6 list-disc list-outside pl-5">
            <li><span class="font-medium text-ink-900">Cheating</span> — talking, peeking at another student's paper, or any other clandestine method of transmitting information during a test or exam.</li>
            <li><span class="font-medium text-ink-900">Plagiarism</span> — using the work of others without citing it; holding the work of others out as your own.</li>
            <li><span class="font-medium text-ink-900">Breach of copyright</span> — photocopying a textbook without the copyright holder's permission.</li>
          </ul>
        </div>
      </div>`;
  }

  function renderRoadmapPage() {
    const items = MODULES.map((mod, idx) => {
      const lessons = courseData.getLessonsForModule(mod.id);
      const doneCount = progressState.countCompletedIn(mod.lessonSlugs);
      const total = mod.lessonSlugs.length;
      const pct = total ? Math.round((doneCount / total) * 100) : 0;

      const lessonRows = lessons
        .map((lesson) => {
          const done = progressState.isCompleted(lesson.slug);
          return `
            <a href="#/lessons/${lesson.slug}" class="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-black/[0.03] transition-colors">
              <span class="flex items-center gap-2.5 text-[14px] text-ink-800">
                <span class="w-4 h-4 rounded-full border ${done ? "bg-done border-done" : "border-black/20"} flex items-center justify-center shrink-0">
                  ${done ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.2 4 7.5 8.5 2.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ""}
                </span>
                ${lesson.title}
              </span>
              <span class="text-ink-500 text-xs">&rarr;</span>
            </a>`;
        })
        .join("");

      return `
        <div class="card overflow-hidden">
          <div class="flex items-center gap-4 px-5 py-4 border-b border-black/5">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-white font-display font-semibold text-sm shrink-0">${idx + 1}</span>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-ink-900">${mod.title}</h3>
              <p class="text-[13px] text-ink-500">${mod.description}</p>
            </div>
            <div class="text-right shrink-0">
              <div class="text-xs font-medium text-ink-600">${doneCount}/${total} lessons</div>
              <div class="w-20 h-1.5 rounded-full bg-black/5 mt-1.5 overflow-hidden">
                <div class="h-full bg-accent rounded-full" style="width:${pct}%"></div>
              </div>
            </div>
          </div>
          <div class="p-2">${lessonRows}</div>
        </div>`;
    }).join("");

    return `
      <div class="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <p class="text-accent-dark font-semibold text-sm tracking-wide uppercase mb-3">Roadmap</p>
        <h1 class="text-3xl font-bold mb-2">Course Roadmap</h1>
        <p class="text-ink-600 mb-8">Follow the modules below in order — each lesson has its slide PDF linked at the bottom of the page.</p>
        <div class="space-y-5">${items}</div>
      </div>`;
  }

  function renderWorkshopsPage() {
    const workshops = RESOURCES.filter((i) => i.category === "Workshop");
    const cards = workshops
      .map((w, i) => {
        const fileName = w.fileUrl.split("/").pop();
        const available = AVAILABLE_FILES.has(fileName);
        if (available) {
          return `
            <a href="${w.fileUrl.replace(/^\//, "")}" target="_blank" rel="noopener" class="card p-5 flex items-center gap-4 hover:border-accent transition-colors">
              <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-900 text-white font-display font-semibold shrink-0">${i + 1}</span>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-ink-900">${w.title}</div>
                <div class="text-xs text-ink-500">Download PDF</div>
              </div>
              <span class="text-ink-400">&darr;</span>
            </a>`;
        }
        return `
          <div class="card p-5 flex items-center gap-4 opacity-50 cursor-not-allowed select-none" title="PDF not available yet">
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-300 text-white font-display font-semibold shrink-0">${i + 1}</span>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-ink-900">${w.title}</div>
              <div class="text-xs text-ink-500">Not available yet</div>
            </div>
          </div>`;
      })
      .join("");

    return `
      <div class="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <p class="text-accent-dark font-semibold text-sm tracking-wide uppercase mb-3">Practice</p>
        <h1 class="text-3xl font-bold mb-2">Workshops</h1>
        <p class="text-ink-600 mb-8">6 hands-on workshops that accompany the course.</p>
        <div class="grid sm:grid-cols-2 gap-3">${cards}</div>
        <p class="text-xs text-ink-400 mt-6">Note: these worksheets are original practice exercises written to match each module's topic, and are not copied from any institution's official course materials. Feel free to swap them out for your own if you have official files.</p>
        <p class="text-xs text-ink-300 mt-1">If any card above still shows "Not available yet," add a matching PDF to the <code class="font-mono bg-black/5 px-1 py-0.5 rounded">files/</code> folder to activate it.</p>
      </div>`;
  }

  function fileCard(item) {
    return `
      <a href="${item.fileUrl.replace(/^\//, "")}" target="_blank" rel="noopener" class="flex items-center gap-3 rounded-lg border border-black/5 bg-white px-4 py-3 hover:border-accent transition-colors group">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light/40 text-accent-dark shrink-0">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2h6l4 4v12H6V2z"/><path d="M12 2v4h4"/></svg>
        </span>
        <span class="text-[14px] text-ink-800 group-hover:text-accent-dark truncate">${item.title}</span>
        <span class="ml-auto text-ink-400 text-xs shrink-0">&darr;</span>
      </a>`;
  }

  function renderResourcesPage() {
    const slides = RESOURCES.filter((i) => i.category === "Lecture Slide");
    const reading = RESOURCES.filter((i) => i.category === "Reading");
    return `
      <div class="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <p class="text-accent-dark font-semibold text-sm tracking-wide uppercase mb-3">Resources</p>
        <h1 class="text-3xl font-bold mb-8">Resources</h1>
        <div class="mb-8">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-ink-600 mb-3">Lecture Slides</h2>
          <div class="grid sm:grid-cols-2 gap-3">${slides.map(fileCard).join("")}</div>
        </div>
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wide text-ink-600 mb-3">Reading</h2>
          <div class="grid sm:grid-cols-2 gap-3">${reading.map(fileCard).join("")}</div>
        </div>
      </div>`;
  }

  const REFS = [
    { text: "Szalwinski, C. M. (2011). Introduction to C++ for C Programmers. December 2011 Edition. Seneca College, Toronto, Canada.", url: "https://ict.senecacollege.ca/~btp200/", note: "This external site now requires a Seneca College VPN connection to access." },
    { text: "Sage, Kingsley. Concise Guide to Object-Oriented Programming. January 2019 Edition. University of Sussex, Brighton, UK." },
    { text: "Trinity College — Java lecture notes (PDF)", url: "http://www.cs.trincoll.edu/~ram/jjj/jjj-os-20170625.pdf" },
    { text: "Java 8 Specification (Oracle Docs)", url: "https://docs.oracle.com/javase/specs/jvms/se8/html/jvms-1.html#jvms-1.1" },
    { text: "Horstmann, Cay. Core Java Volume I and II — 11th Edition.", url: "https://www.amazon.com/Core-Java-I-Fundamentals-11th-Horstmann/dp/0135166306" },
    { text: "TutorialsPoint — What are reference data types in Java", url: "https://www.tutorialspoint.com/What-are-reference-data-types-in-Java" },
    { text: "JavaTpoint — Memory Management in Java", url: "https://www.javatpoint.com/memory-management-in-java" },
  ];

  function renderReferencesPage() {
    const items = REFS.map(
      (r) => `
      <li class="flex gap-3 py-3 border-b border-black/5 last:border-0">
        <span class="text-accent mt-0.5">&sect;</span>
        <span class="text-[14px] text-ink-700 leading-6">
          ${r.text}
          ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="block text-accent-dark hover:underline text-[13px] mt-0.5 break-all">${r.url}</a>` : ""}
          ${r.note ? `<span class="block text-ink-400 text-[12px] mt-0.5">${r.note}</span>` : ""}
        </span>
      </li>`
    ).join("");

    return `
      <div class="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <p class="text-accent-dark font-semibold text-sm tracking-wide uppercase mb-3">References</p>
        <h1 class="text-3xl font-bold mb-8">Text and Reference Books</h1>
        <div class="card p-6">
          <ul>${items}</ul>
        </div>
      </div>`;
  }

  function renderLessonPage(slug) {
    const lesson = lessonBySlug.get(slug);
    if (!lesson) {
      return `
        <div class="max-w-2xl mx-auto px-6 py-16 text-center">
          <h1 class="text-xl font-semibold mb-2">Lesson not found</h1>
          <a href="#/roadmap" class="btn-secondary">&larr; Back to roadmap</a>
        </div>`;
    }

    const module = MODULES.find((m) => m.id === lesson.moduleId);
    const siblingLessons = courseData.getLessonsForModule(lesson.moduleId);
    const allLessons = courseData.getLessons();
    const currentIdx = allLessons.findIndex((l) => l.slug === slug);
    const prev = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
    const next = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

    const outline = extractOutline(lesson.blocks);
    const isDone = progressState.isCompleted(slug);

    const outlineHtml = outline.length
      ? `
        <div class="hidden xl:block w-56 shrink-0">
          <div class="sticky top-10">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-ink-500 mb-3">On this page</div>
            <nav class="space-y-2 text-[13px] border-l border-black/10">
              ${outline.map((o) => `<a href="#/lessons/${slug}#${o.id}" class="block pl-3 -ml-px border-l-2 border-transparent hover:border-accent text-ink-600 hover:text-ink-900 transition-colors">${o.text}</a>`).join("")}
            </nav>
          </div>
        </div>`
      : "";

    return `
      <div class="px-6 md:px-10 py-10 md:py-14">
        <div class="max-w-3xl mx-auto flex gap-10">
          <article class="min-w-0 flex-1">
            <nav class="text-[13px] text-ink-500 mb-4 flex items-center gap-1.5 flex-wrap">
              <a href="#/roadmap" class="hover:text-accent-dark">Roadmap</a>
              <span>/</span>
              <span>${module?.title ?? ""}</span>
            </nav>

            <div class="flex items-start justify-between gap-4 mb-8">
              <h1 class="text-3xl font-bold leading-tight">${lesson.title}</h1>
              <button
                type="button"
                data-action="toggle-complete"
                data-slug="${slug}"
                class="shrink-0 mt-1 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  isDone ? "border-done/30 bg-done/10 text-done" : "border-black/10 text-ink-600 hover:border-accent hover:text-accent-dark"
                }"
              >
                <span class="w-3.5 h-3.5 rounded-full border ${isDone ? "bg-done border-done" : "border-black/30"} flex items-center justify-center">
                  ${isDone ? '<svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.2 4 7.5 8.5 2.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ""}
                </span>
                ${isDone ? "Completed" : "Mark as Complete"}
              </button>
            </div>

            <div class="prose-lesson">
              ${renderBlocks(lesson.blocks)}
            </div>

            <div class="mt-12 pt-6 border-t border-black/5 flex items-center justify-between gap-4">
              ${prev ? `<a href="#/lessons/${prev.slug}" class="btn-secondary max-w-[45%]"><span aria-hidden="true">&larr;</span><span class="truncate">${prev.title}</span></a>` : "<span></span>"}
              ${next ? `<a href="#/lessons/${next.slug}" class="btn-primary max-w-[45%]"><span class="truncate">${next.title}</span><span aria-hidden="true">&rarr;</span></a>` : "<span></span>"}
            </div>

            ${
              siblingLessons.length > 1
                ? `<div class="mt-10 card p-5">
                    <div class="text-[13px] font-semibold text-ink-600 mb-3">Other lessons in "${module?.title}"</div>
                    <div class="flex flex-wrap gap-2">
                      ${siblingLessons
                        .map(
                          (l) =>
                            `<a href="#/lessons/${l.slug}" class="text-[13px] rounded-full border px-3 py-1.5 transition-colors ${
                              l.slug === slug ? "border-accent bg-accent-light/40 text-accent-dark font-medium" : "border-black/10 text-ink-600 hover:border-accent"
                            }">${l.title}</a>`
                        )
                        .join("")}
                    </div>
                  </div>`
                : ""
            }
          </article>
          ${outlineHtml}
        </div>
      </div>`;
  }

  // ---------- router ----------
  const mount = document.getElementById("page");
  const sidebarMount = document.getElementById("sidebar");

  function currentPathAndHash() {
    const raw = window.location.hash.replace(/^#/, "") || "/";
    const [path, frag] = raw.split("#");
    return { path: path || "/", frag };
  }

  function render() {
    const { path, frag } = currentPathAndHash();
    let html;
    let lessonSlug = null;

    if (path === "/") html = renderHomePage();
    else if (path === "/roadmap") html = renderRoadmapPage();
    else if (path === "/workshops") html = renderWorkshopsPage();
    else if (path === "/resources") html = renderResourcesPage();
    else if (path === "/references") html = renderReferencesPage();
    else if (path.startsWith("/lessons/")) {
      lessonSlug = decodeURIComponent(path.slice("/lessons/".length));
      html = renderLessonPage(lessonSlug);
    } else {
      html = `<div class="p-10 text-center text-ink-600">Page not found.</div>`;
    }

    mount.innerHTML = html;
    sidebarMount.innerHTML = renderSidebar(path);
    window.scrollTo({ top: 0 });

    if (frag) {
      const el = document.getElementById(frag);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  window.addEventListener("hashchange", render);

  // click delegation for copy-code / toggle-complete buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    if (action === "copy-code") {
      const target = document.getElementById(btn.getAttribute("data-target"));
      if (target) {
        navigator.clipboard?.writeText(target.textContent || "").then(() => {
          const original = btn.textContent;
          btn.textContent = "Copied!";
          setTimeout(() => (btn.textContent = original), 1200);
        });
      }
    } else if (action === "toggle-complete") {
      progressState.toggle(btn.getAttribute("data-slug"));
      render();
    }
  });

  // mobile sidebar toggle
  const menuBtn = document.getElementById("menu-btn");
  const sidebarWrap = document.getElementById("sidebar-wrap");
  const overlay = document.getElementById("overlay");
  function closeSidebar() {
    sidebarWrap.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  }
  menuBtn?.addEventListener("click", () => {
    sidebarWrap.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
  });
  overlay?.addEventListener("click", closeSidebar);
  mount.addEventListener("click", (e) => {
    if (e.target.closest("a") && window.innerWidth < 1024) closeSidebar();
  });
  sidebarMount.addEventListener("click", (e) => {
    if (e.target.closest("a") && window.innerWidth < 1024) closeSidebar();
  });

  render();
})();
