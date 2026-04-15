const state = {
  resumeFile: null,
  jdFiles: [],
  jdText: "",
  jdMode: "file",
  resumeData: null,
};

const elements = {
  resumeInput: document.getElementById("resume-file"),
  jdInput: document.getElementById("jd-file"),
  resumeName: document.getElementById("resume-file-name"),
  jdName: document.getElementById("jd-file-name"),
  jdText: document.getElementById("jd-text"),
  jdModeFile: document.getElementById("jd-mode-file"),
  jdModeText: document.getElementById("jd-mode-text"),
  jdFilePanel: document.getElementById("jd-file-panel"),
  jdTextPanel: document.getElementById("jd-text-panel"),
  resumeUploadBtn: document.getElementById("resume-upload-btn"),
  jdUploadBtn: document.getElementById("jd-upload-btn"),
  results: document.getElementById("results"),
  resumeSkills: document.getElementById("resume-skills"),
  jdSkills: document.getElementById("jd-skills"),
  skillsTableBody: document.getElementById("skills-table-body"),
  batchResults: document.getElementById("batch-results"),
  batchSummary: document.getElementById("batch-summary"),
  batchTableBody: document.getElementById("batch-table-body"),
  scoreValue: document.getElementById("score-value"),
  scoreBar: document.getElementById("score-bar"),
  scoreLabel: document.getElementById("score-label"),
  candidateName: document.getElementById("candidate-name"),
  toast: document.getElementById("toast"),
};

const setButtonLoading = (button, isLoading, defaultText, loadingText) => {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
};

const showToast = (message) => {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  elements.toast.classList.add("animate-fadeInUp");

  setTimeout(() => {
    elements.toast.classList.add("hidden");
    elements.toast.classList.remove("animate-fadeInUp");
  }, 2800);
};

const createTag = (text) => {
  const tag = document.createElement("span");
  tag.className =
    "inline-flex items-center rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200";
  tag.textContent = text;
  return tag;
};

const renderSkillTags = (container, skills) => {
  container.innerHTML = "";

  if (!skills.length) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-slate-400";
    empty.textContent = "No skills found";
    container.appendChild(empty);
    return;
  }

  skills.forEach((skill) => container.appendChild(createTag(skill)));
};

const createStatusBadge = (presentInResume) => {
  const badge = document.createElement("span");

  if (presentInResume) {
    badge.className =
      "inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300";
    badge.textContent = "Present";
    return badge;
  }

  badge.className =
    "inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300";
  badge.textContent = "Missing";
  return badge;
};

const renderSkillsTable = (analysis) => {
  elements.skillsTableBody.innerHTML = "";

  if (!analysis.length) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td class="px-3 py-3 text-slate-400" colspan="2">No JD skills available for comparison.</td>';
    elements.skillsTableBody.appendChild(row);
    return;
  }

  analysis.forEach((entry) => {
    const row = document.createElement("tr");

    const skillCell = document.createElement("td");
    skillCell.className = "px-3 py-3 text-slate-200";
    skillCell.textContent = entry.skill;

    const statusCell = document.createElement("td");
    statusCell.className = "px-3 py-3";
    statusCell.appendChild(createStatusBadge(entry.presentInResume));

    row.appendChild(skillCell);
    row.appendChild(statusCell);
    elements.skillsTableBody.appendChild(row);
  });
};

const updateProgressBar = (score) => {
  const numericScore = Number.isFinite(score) ? score : 0;
  const bounded = Math.max(0, Math.min(100, numericScore));

  elements.scoreValue.textContent = `${bounded}%`;
  elements.scoreBar.style.width = `${bounded}%`;

  if (bounded >= 70) {
    elements.scoreValue.className =
      "text-4xl font-extrabold text-emerald-300 sm:text-5xl";
    elements.scoreBar.className =
      "h-full rounded-full bg-emerald-400 transition-all duration-700 ease-out";
    elements.scoreLabel.textContent = "Strong alignment";
    return;
  }

  if (bounded >= 40) {
    elements.scoreValue.className =
      "text-4xl font-extrabold text-amber-300 sm:text-5xl";
    elements.scoreBar.className =
      "h-full rounded-full bg-amber-400 transition-all duration-700 ease-out";
    elements.scoreLabel.textContent = "Moderate alignment";
    return;
  }

  elements.scoreValue.className =
    "text-4xl font-extrabold text-rose-300 sm:text-5xl";
  elements.scoreBar.className =
    "h-full rounded-full bg-rose-400 transition-all duration-700 ease-out";
  elements.scoreLabel.textContent = "Low alignment";
};

const parseResumeResponse = (responseJson) => {
  const payload = responseJson?.data || {};

  return {
    candidateName:
      String(payload.candidateName || "").trim() || "Anonymous Candidate",
    rawText: payload.rawText || "",
    cleanedText: payload.cleanedText || "",
    skills: Array.isArray(payload.skills) ? payload.skills : [],
  };
};

const parseJDResponse = (responseJson) => {
  const job = Array.isArray(responseJson?.matchingJobs)
    ? responseJson.matchingJobs[0]
    : null;

  const analysis = Array.isArray(job?.skillsAnalysis) ? job.skillsAnalysis : [];

  return {
    name: String(responseJson?.name || "").trim() || "Anonymous Candidate",
    resumeSkills: Array.isArray(responseJson?.resumeSkills)
      ? responseJson.resumeSkills
      : [],
    skillsAnalysis: analysis,
    matchingScore: Number.isFinite(job?.matchingScore) ? job.matchingScore : 0,
    jdSkills: analysis.map((item) => item.skill),
  };
};

const parseJDBatchResponse = (responseJson) => {
  const comparisons = Array.isArray(responseJson?.comparisons)
    ? responseJson.comparisons
    : [];

  return {
    totalJDs: Number.isFinite(responseJson?.totalJDs)
      ? responseJson.totalJDs
      : comparisons.length,
    comparisons,
    bestMatch: responseJson?.bestMatch || comparisons[0] || null,
  };
};

const handleUpload = async ({ endpoint, file, files = [], extras = {} }) => {
  const formData = new FormData();

  if (file) {
    formData.append("file", file);
  }

  if (Array.isArray(files) && files.length > 0) {
    files.forEach((item) => {
      if (item) {
        formData.append("files", item);
      }
    });
  }

  Object.entries(extras).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.message || "Upload failed. Please try again.");
  }

  return json;
};

const renderResults = (resumeData, jdData) => {
  elements.batchResults.classList.add("hidden");
  elements.batchTableBody.innerHTML = "";
  elements.candidateName.textContent =
    jdData.name || resumeData.candidateName || "Anonymous Candidate";
  renderSkillTags(elements.resumeSkills, resumeData.skills);
  renderSkillTags(elements.jdSkills, jdData.jdSkills);
  renderSkillsTable(jdData.skillsAnalysis);
  updateProgressBar(jdData.matchingScore);

  elements.results.classList.remove("hidden", "opacity-0");
  elements.results.classList.add("animate-fadeInUp");
};

const createScoreBadge = (score) => {
  const badge = document.createElement("span");
  const bounded = Math.max(0, Math.min(100, Number(score) || 0));

  if (bounded >= 70) {
    badge.className =
      "inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300";
  } else if (bounded >= 40) {
    badge.className =
      "inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300";
  } else {
    badge.className =
      "inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300";
  }

  badge.textContent = `${bounded}%`;
  return badge;
};

const renderBatchComparison = (resumeData, batchData) => {
  const best = batchData.bestMatch;

  if (best?.fullResult) {
    const bestParsed = parseJDResponse(best.fullResult);
    renderResults(resumeData, bestParsed);
  }

  elements.batchTableBody.innerHTML = "";

  batchData.comparisons.forEach((entry) => {
    const row = document.createElement("tr");

    const sourceCell = document.createElement("td");
    sourceCell.className = "px-3 py-3 text-slate-200";
    sourceCell.textContent = entry.sourceName || "JD Source";

    const roleCell = document.createElement("td");
    roleCell.className = "px-3 py-3 text-slate-300";
    roleCell.textContent = entry.job?.role || "Unspecified Role";

    const scoreCell = document.createElement("td");
    scoreCell.className = "px-3 py-3";
    scoreCell.appendChild(createScoreBadge(entry.matchingScore));

    row.appendChild(sourceCell);
    row.appendChild(roleCell);
    row.appendChild(scoreCell);
    elements.batchTableBody.appendChild(row);
  });

  elements.batchSummary.textContent = `Processed ${batchData.totalJDs} JDs. Showing best match details above.`;
  elements.batchResults.classList.remove("hidden");
};

const validatePDFFile = (file) => {
  if (!file) {
    return "Please select a PDF file.";
  }

  const fileName = String(file.name || "").toLowerCase();
  if (!fileName.endsWith(".pdf")) {
    return "Only PDF files are allowed.";
  }

  return null;
};

const validateJDInput = (files, text) => {
  const trimmedText = String(text || "").trim();

  if (trimmedText.length > 0) {
    return null;
  }

  if (!Array.isArray(files) || files.length === 0) {
    return "Please upload a JD file or paste JD text.";
  }

  const hasInvalidFile = files.some((file) => {
    const fileName = String(file?.name || "").toLowerCase();
    return (
      !fileName.endsWith(".pdf") &&
      !fileName.endsWith(".txt") &&
      !fileName.endsWith(".md")
    );
  });

  if (hasInvalidFile) {
    return "Only PDF, TXT, or MD files are allowed for JD upload.";
  }

  return null;
};

const setJDMode = (mode) => {
  state.jdMode = mode;

  const isFileMode = mode === "file";

  elements.jdModeFile.className = isFileMode
    ? "rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition"
    : "rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 transition hover:text-white";

  elements.jdModeText.className = !isFileMode
    ? "rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition"
    : "rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 transition hover:text-white";

  elements.jdFilePanel.classList.toggle("hidden", !isFileMode);
  elements.jdTextPanel.classList.toggle("hidden", isFileMode);
};

const bindDropZone = (zoneType, input, onSelect) => {
  const zone = document.querySelector(`[data-zone="${zoneType}"]`);
  if (!zone) return;

  ["dragenter", "dragover"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("border-indigo-400", "bg-indigo-500/5");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove("border-indigo-400", "bg-indigo-500/5");
    });
  });

  zone.addEventListener("drop", (event) => {
    const dropped = event.dataTransfer?.files?.[0] || null;
    if (!dropped) return;

    const transfer = new DataTransfer();
    transfer.items.add(dropped);
    input.files = transfer.files;
    onSelect(dropped);
  });
};

const init = () => {
  bindDropZone("resume", elements.resumeInput, (file) => {
    state.resumeFile = file;
    elements.resumeName.textContent = file.name;
  });

  bindDropZone("jd", elements.jdInput, (file) => {
    setJDMode("file");
    state.jdFiles = file ? [file] : [];
    state.jdText = "";
    elements.jdText.value = "";
    elements.jdName.textContent = file ? file.name : "No file selected";
  });

  elements.jdText.addEventListener("input", () => {
    if (elements.jdText.value.trim()) {
      setJDMode("text");
    }
    state.jdText = elements.jdText.value;
  });

  elements.jdModeFile.addEventListener("click", () => {
    setJDMode("file");
  });

  elements.jdModeText.addEventListener("click", () => {
    setJDMode("text");
  });

  elements.resumeInput.addEventListener("change", () => {
    const selected = elements.resumeInput.files?.[0] || null;
    state.resumeFile = selected;
    elements.resumeName.textContent = selected
      ? selected.name
      : "No file selected";
  });

  elements.jdInput.addEventListener("change", () => {
    const selectedFiles = Array.from(elements.jdInput.files || []);
    state.jdFiles = selectedFiles;

    if (selectedFiles.length > 0) {
      setJDMode("file");
    }

    if (selectedFiles.length === 0) {
      elements.jdName.textContent = "No file selected";
      return;
    }

    if (selectedFiles.length === 1) {
      elements.jdName.textContent = selectedFiles[0].name;
      return;
    }

    elements.jdName.textContent = `${selectedFiles.length} files selected`;
  });

  elements.resumeUploadBtn.addEventListener("click", async () => {
    const validationError = validatePDFFile(state.resumeFile);
    if (validationError) {
      showToast(validationError);
      return;
    }

    try {
      setButtonLoading(
        elements.resumeUploadBtn,
        true,
        "Upload Resume",
        "Uploading Resume...",
      );

      const response = await handleUpload({
        endpoint: "/api/resume/upload",
        file: state.resumeFile,
      });

      state.resumeData = parseResumeResponse(response);
      showToast("Resume uploaded and processed.");
    } catch (error) {
      showToast(error.message || "Failed to upload resume.");
    } finally {
      setButtonLoading(
        elements.resumeUploadBtn,
        false,
        "Upload Resume",
        "Uploading Resume...",
      );
    }
  });

  elements.jdUploadBtn.addEventListener("click", async () => {
    const validationError = validateJDInput(
      state.jdMode === "text" ? [] : state.jdFiles,
      state.jdMode === "text" ? state.jdText : "",
    );
    if (validationError) {
      showToast(validationError);
      return;
    }

    if (!state.resumeData) {
      showToast("Please upload and process resume first.");
      return;
    }

    try {
      setButtonLoading(
        elements.jdUploadBtn,
        true,
        "Match Against Resume",
        "Processing Match...",
      );

      if (state.jdMode === "file" && state.jdFiles.length > 1) {
        const batchResponse = await handleUpload({
          endpoint: "/api/jd/batch-upload",
          files: state.jdFiles,
          extras: {
            name: state.resumeData.candidateName,
            resumeSkills: state.resumeData.skills.join(","),
            jobId: "JD001",
            role: "Software Engineer",
          },
        });

        const batchData = parseJDBatchResponse(batchResponse);
        renderBatchComparison(state.resumeData, batchData);
        showToast(`Matching completed for ${batchData.totalJDs} JDs.`);
      } else {
        const response = await handleUpload({
          endpoint: "/api/jd/upload",
          file: state.jdMode === "text" ? null : state.jdFiles[0] || null,
          extras: {
            name: state.resumeData.candidateName,
            resumeSkills: state.resumeData.skills.join(","),
            jobId: "JD001",
            role: "Software Engineer",
            rawText: state.jdMode === "text" ? state.jdText.trim() : "",
          },
        });

        const jdData = parseJDResponse(response);
        renderResults(state.resumeData, jdData);
        showToast("Matching insights generated successfully.");
      }
    } catch (error) {
      showToast(error.message || "Failed to process JD.");
    } finally {
      setButtonLoading(
        elements.jdUploadBtn,
        false,
        "Match Against Resume",
        "Processing Match...",
      );
    }
  });

  setJDMode("file");
};

init();
