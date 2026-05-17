const VIDEO_PATH = "assets/wintrip-promo.mp4";
const VIDEO_FILE_PATH = "/Users/pwintri2/Documents/Codex/2026-04-22-files-mentioned-by-the-user-ai/wintrip-promo-copilot/assets/wintrip-promo.mp4";
const STORAGE_KEY = "wintripPromoCopilotState";
const DEFAULT_PROMO_TEXT = [
  "It is here!",
  "The soul journey of John May.",
  "Dive into the mystery of your soul and discover the karmic journey of John May in this spiritual romance trilogy."
].join("\n");

const platforms = [
  {
    id: "linkedin",
    name: "LinkedIn",
    format: "post + video",
    note: "Strong for readers, writers, and reflective professional networks.",
    guardrail: "Post from your own profile with one sincere reason this book matters to you.",
    openLabel: "Open feed",
    openUrl: () => "https://www.linkedin.com/feed/"
  },
  {
    id: "x",
    name: "X",
    format: "kort + link",
    note: "Good for testing which sentence creates curiosity.",
    guardrail: "Use 1 to 2 posts a day and reply to real reactions instead of repeating the same pitch.",
    openLabel: "Open post",
    openUrl: ({ text, url }) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
  },
  {
    id: "facebook",
    name: "Facebook",
    format: "post + video",
    note: "Useful for personal circles and reader groups.",
    guardrail: "Only post in groups where book promotion is allowed and add context for that group.",
    openLabel: "Open deelvenster",
    openUrl: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  },
  {
    id: "instagram",
    name: "Instagram",
    format: "reel caption",
    note: "Use the 12s video as a Reel with the link in bio or profile.",
    guardrail: "Upload the video manually and use the first line as the on-screen caption.",
    openLabel: "Open Instagram",
    openUrl: () => "https://www.instagram.com/"
  },
  {
    id: "tiktok",
    name: "TikTok",
    format: "video caption",
    note: "Let the video carry the atmosphere; keep the caption direct.",
    guardrail: "Avoid broad hashtag stuffing. Choose 3 to 5 tags that fit spiritual romance readers.",
    openLabel: "Open upload",
    openUrl: () => "https://www.tiktok.com/upload"
  },
  {
    id: "youtube",
    name: "YouTube Shorts",
    format: "short + beschrijving",
    note: "The vertical video fits Shorts directly.",
    guardrail: "The title may create mystery, but the description should clearly say the ebook is available through the link.",
    openLabel: "Open upload",
    openUrl: () => "https://www.youtube.com/upload"
  },
  {
    id: "reddit",
    name: "Reddit",
    format: "vraag + link",
    note: "Only useful in communities where book discussion or feedback is welcome.",
    guardrail: "Start with a genuine discussion question. Read subreddit rules before linking.",
    openLabel: "Open submit",
    openUrl: ({ text, url }) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(firstLine(text))}`
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    format: "persoonlijk",
    note: "Best for warm contacts who like books, spirituality, or romance.",
    guardrail: "Send to small relevant groups or 1-on-1. Personalize the first sentence.",
    openLabel: "Open WhatsApp",
    openUrl: ({ text, url }) => `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`
  },
  {
    id: "telegram",
    name: "Telegram",
    format: "kanaalpost",
    note: "Useful for reading communities and spiritual discussion channels.",
    guardrail: "Post where you already add value. Do not drop cold links in random groups.",
    openLabel: "Open Telegram",
    openUrl: ({ text, url }) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  },
  {
    id: "email",
    name: "E-mail",
    format: "micro pitch",
    note: "For people who may click later when they have time.",
    guardrail: "Choose 5 to 10 relevant recipients and write the greeting yourself.",
    openLabel: "Open mail",
    openUrl: ({ text, url }) => `mailto:?subject=${encodeURIComponent("The Soul Journey of John May is here")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`
  }
];

const ideaTemplates = [
  {
    title: "Warm reader sprint",
    body: ({ link }) => `Make a list of 12 warm contacts who enjoy books, spirituality, romance, or mystery. Send each a personal line plus: "The Soul Journey of John May is here. If you have 12 seconds, watch this: ${link}"`
  },
  {
    title: "Book club angle",
    body: ({ audience }) => `Approach 3 book clubs, newsletters, or pages that reach ${audience}. Ask for one honest reaction to the premise instead of a generic repost.`
  },
  {
    title: "Discussion route",
    body: () => "Find 5 active conversations about soulmates, karma, reincarnation, spiritual fiction, or romance trilogies. Add a thoughtful comment; share the link only when it naturally fits."
  },
  {
    title: "QR reading moment",
    body: () => "Print the mini-poster and place it at a reading table, event, workshop, counter, or next to your laptop. Let people scan the ebook instead of spelling the link."
  },
  {
    title: "Shorts trio",
    body: () => "Post the same video on TikTok, Instagram Reels, and YouTube Shorts, but give each platform a different first line about John May's soul journey."
  },
  {
    title: "Mystery question",
    body: () => "Ask in one niche community: 'What kind of karmic love story do you expect after these 12 seconds?' Use the replies as fuel for your next post."
  }
];

const form = document.querySelector("#campaignForm");
const channelGrid = document.querySelector("#channelGrid");
const ideaGrid = document.querySelector("#ideaGrid");
const toast = document.querySelector("#toast");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const qrImage = document.querySelector("#qrImage");
const posterHook = document.querySelector("#posterHook");
const posterSubtitle = document.querySelector("#posterSubtitle");
const posterLink = document.querySelector("#posterLink");

let state = loadState();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
  showToast("Nieuwe copy staat klaar.");
});

document.querySelector("#copyAllButton").addEventListener("click", () => {
  copyText(buildMarkdownPlan(), "Route gekopieerd.");
});

document.querySelector("#exportButton").addEventListener("click", () => {
  const blob = new Blob([buildMarkdownPlan()], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "wintrip-promotieplan.md";
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Planbestand gemaakt.");
});

document.querySelector("#copyVideoPathButton").addEventListener("click", () => {
  copyText(VIDEO_FILE_PATH, "Video-pad gekopieerd.");
});

document.querySelector("#printPosterButton").addEventListener("click", () => window.print());

document.querySelector("#copyPosterTextButton").addEventListener("click", () => {
  const settings = getSettings();
  copyText(`${settings.hook}\n${settings.link}`, "Postertekst gekopieerd.");
});

render();

function render() {
  const settings = getSettings();
  updatePoster(settings);
  renderChannels(settings);
  renderIdeas(settings);
  updateProgress();
  saveState();
}

function getSettings() {
  const rawLink = document.querySelector("#linkInput").value.trim() || "https://wintrip-projects.nl";
  return {
    link: normalizeUrl(rawLink),
    hook: document.querySelector("#hookInput").value.trim() || DEFAULT_PROMO_TEXT,
    audience: document.querySelector("#audienceInput").value.trim(),
    tone: document.querySelector("#toneInput").value,
    dailyLimit: Number(document.querySelector("#dailyLimitInput").value || 5),
    hashtags: document.querySelector("#hashtagsInput").value.trim()
  };
}

function renderChannels(settings) {
  channelGrid.innerHTML = "";

  platforms.forEach((platform, index) => {
    const url = buildUtmUrl(settings.link, platform.id);
    const text = composeText(platform, settings, index);
    const openUrl = platform.openUrl({ text, url });
    const done = Boolean(state.done[platform.id]);
    const card = document.createElement("article");
    card.className = `channel-card ${platform.id}`;
    card.innerHTML = `
      <div class="card-head">
        <div>
          <h3>${platform.name}</h3>
          <span class="badge">${platform.format}</span>
        </div>
        <label class="done-check">
          <input type="checkbox" ${done ? "checked" : ""} data-done="${platform.id}">
          Klaar
        </label>
      </div>
      <p class="platform-note">${platform.note}</p>
      <textarea class="copy-box" data-copybox="${platform.id}">${text}</textarea>
      <div class="url-row">
        <input readonly value="${url}" aria-label="Tracking link voor ${platform.name}">
        <button type="button" data-copy-url="${platform.id}">Kopieer link</button>
      </div>
      <p class="guardrail">${platform.guardrail}</p>
      <div class="card-actions">
        <button class="primary" type="button" data-copy-text="${platform.id}">Kopieer tekst</button>
        <button type="button" data-open="${platform.id}">${platform.openLabel}</button>
      </div>
    `;

    card.querySelector("[data-copy-text]").addEventListener("click", () => {
      copyText(card.querySelector(".copy-box").value, `${platform.name} tekst gekopieerd.`);
    });

    card.querySelector("[data-copy-url]").addEventListener("click", () => {
      copyText(url, `${platform.name} link gekopieerd.`);
    });

    card.querySelector("[data-open]").addEventListener("click", () => {
      window.open(openUrl, "_blank", "noopener,noreferrer");
    });

    card.querySelector("[data-done]").addEventListener("change", (event) => {
      state.done[platform.id] = event.target.checked;
      saveState();
      updateProgress();
    });

    channelGrid.appendChild(card);
  });
}

function renderIdeas(settings) {
  ideaGrid.innerHTML = "";
  ideaTemplates.forEach((idea) => {
    const card = document.createElement("article");
    card.className = "idea-card";
    const body = idea.body(settings);
    card.innerHTML = `
      <h3>${idea.title}</h3>
      <p>${body}</p>
      <button type="button">Kopieer zet</button>
    `;
    card.querySelector("button").addEventListener("click", () => copyText(`${idea.title}\n${body}`, "Promotiezet gekopieerd."));
    ideaGrid.appendChild(card);
  });
}

function composeText(platform, settings, index) {
  const linkLine = platform.id === "instagram" || platform.id === "tiktok"
    ? "Link: wintrip-projects.nl"
    : settings.link;
  const hashtags = compactHashtags(settings.hashtags, platform.id);
  const audienceLine = settings.audience ? `For ${settings.audience}.` : "";
  const toneOpeners = {
    bold: [
      settings.hook,
      "A spiritual romance trilogy about karma, longing, and the mystery of the soul.",
      "Buy or discover it here:"
    ],
    clean: [
      "The Soul Journey of John May is now available as an ebook.",
      audienceLine,
      "Read more and buy it here:"
    ],
    mystery: [
      "It is here!",
      "A soul remembers. A karmic journey begins. A spiritual romance unfolds.",
      "Enter the story here:"
    ],
    community: [
      "I am sharing a new spiritual romance trilogy and would love your first impression.",
      audienceLine,
      "What does this first glimpse of John May's journey awaken in you?"
    ]
  };
  const lines = toneOpeners[settings.tone] || toneOpeners.bold;

  if (platform.id === "x") {
    return [
      "It is here!",
      "The soul journey of John May.",
      "A spiritual romance trilogy about mystery, karma, and the journey of the soul.",
      hashtags
    ].filter(Boolean).join("\n");
  }

  if (platform.id === "reddit") {
    return [
      "Discussion: what draws you into a spiritual romance trilogy?",
      "The Soul Journey of John May follows a karmic path through mystery, love, and the soul's deeper memory.",
      linkLine
    ].join("\n");
  }

  if (platform.id === "whatsapp") {
    return [
      "Hi, I wanted to share this with you: The Soul Journey of John May is here.",
      "It is a spiritual romance trilogy about mystery, karma, and the soul's journey.",
      "You can discover and buy the ebook here:",
      linkLine
    ].join("\n");
  }

  if (platform.id === "email") {
    return [
      "Hi,",
      "",
      "It is here: The Soul Journey of John May.",
      "Dive into the mystery of your soul and discover the karmic journey of John May in this spiritual romance trilogy.",
      "You can discover and buy the ebook here:",
      linkLine,
      "",
      "Thank you!"
    ].join("\n");
  }

  if (platform.id === "instagram") {
    return [
      "It is here!",
      "The soul journey of John May.",
      "Dive into mystery, karma, and spiritual romance.",
      "Buy the ebook via the link in bio or go to wintrip-projects.nl",
      hashtags
    ].filter(Boolean).join("\n");
  }

  if (platform.id === "tiktok") {
    return [
      "POV: a soul journey begins.",
      "The Soul Journey of John May is here.",
      "A spiritual romance trilogy about karma, mystery, and love.",
      "wintrip-projects.nl",
      hashtags
    ].filter(Boolean).join("\n");
  }

  if (platform.id === "youtube") {
    return [
      "Title: The Soul Journey of John May is here",
      "",
      "Description:",
      settings.hook,
      `Buy or discover the ebook here: ${linkLine}`,
      hashtags
    ].filter(Boolean).join("\n");
  }

  const extra = index % 2 === 0
    ? "The video is short on purpose: feel the mystery first, then step into the story."
    : "If you are drawn to karma, soul memory, and impossible love, this one is for you.";

  return [
    lines[0],
    lines[1],
    extra,
    lines[2],
    linkLine,
    hashtags
  ].filter(Boolean).join("\n");
}

function compactHashtags(tags, platformId) {
  if (!tags) return "";
  const parts = tags.split(/\s+/).filter(Boolean);
  const limit = platformId === "instagram" || platformId === "tiktok" ? 6 : 4;
  return parts.slice(0, limit).join(" ");
}

function buildUtmUrl(rawUrl, source) {
  let url;
  try {
    url = new URL(normalizeUrl(rawUrl));
  } catch {
    url = new URL("https://wintrip-projects.nl");
  }
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", "it_is_here");
  return url.toString();
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function updatePoster(settings) {
  posterHook.textContent = "It is here!";
  posterSubtitle.textContent = "The soul journey of John May. A spiritual romance trilogy.";
  posterLink.textContent = settings.link.replace(/^https?:\/\//, "");
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(settings.link)}`;
}

function updateProgress() {
  const doneCount = platforms.filter((platform) => state.done[platform.id]).length;
  const total = platforms.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  progressText.textContent = `${doneCount}/${total} klaar`;
  progressBar.style.width = `${pct}%`;
}

function buildMarkdownPlan() {
  const settings = getSettings();
  const lines = [
    "# The Soul Journey of John May promotion route",
    "",
    `Link: ${settings.link}`,
    `Video: ${VIDEO_PATH}`,
    `Daglimiet: ${settings.dailyLimit} plaatsingen`,
    "",
    "## Sociale posts"
  ];

  platforms.forEach((platform, index) => {
    lines.push("", `### ${platform.name}`, "");
    lines.push(composeText(platform, settings, index));
    lines.push("", `Tracking link: ${buildUtmUrl(settings.link, platform.id)}`);
  });

  lines.push("", "## Outside-the-box zetten");
  ideaTemplates.forEach((idea) => {
    lines.push("", `- ${idea.title}: ${idea.body(settings)}`);
  });

  return lines.join("\n");
}

async function copyText(value, message) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  showToast(message);
}

function firstLine(value) {
  return value.split("\n").find(Boolean) || "Wintrip Projects";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), 1800);
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { done: {} };
  } catch {
    return { done: {} };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
