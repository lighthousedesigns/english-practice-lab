(function () {
  "use strict";

  var draftKey = "mrReaPracticeHubDraft";
  var publishedLibrary = normalizeLibrary(window.PRACTICE_LIBRARY || { version: 1, sessions: [] });
  var savedDraft = loadDraft();
  var library = savedDraft || clone(publishedLibrary);
  var selectedIndex = 0;

  var el = {
    sessionList: document.getElementById("session-list"),
    sessionCount: document.getElementById("session-count"),
    editSessionHeading: document.getElementById("edit-session-heading"),
    title: document.getElementById("edit-title"),
    id: document.getElementById("edit-id"),
    category: document.getElementById("edit-category"),
    duration: document.getElementById("edit-duration"),
    listed: document.getElementById("edit-listed"),
    description: document.getElementById("edit-description"),
    directions: document.getElementById("edit-directions"),
    submission: document.getElementById("edit-submission"),
    questionList: document.getElementById("question-list"),
    questionCount: document.getElementById("question-count"),
    validationPanel: document.getElementById("validation-panel"),
    validationSummary: document.getElementById("validation-summary"),
    validationErrors: document.getElementById("validation-errors"),
    status: document.getElementById("editor-status"),
    importSessionFile: document.getElementById("import-session-file"),
    importLibraryFile: document.getElementById("import-library-file")
  };

  initialize();

  function initialize() {
    bindButton("add-session", addSession);
    bindButton("duplicate-session", duplicateSession);
    bindButton("delete-session", deleteSession);
    bindButton("add-question", addQuestion);
    bindButton("save-draft", saveDraft);
    bindButton("export-session", exportSession);
    bindButton("export-library", exportLibrary);
    bindButton("export-publishable", exportPublishable);
    bindButton("reset-library", resetLibrary);
    bindButton("clear-draft", clearDraft);
    bindButton("preview-session", previewSession);
    bindButton("import-session", function () { el.importSessionFile.click(); });
    bindButton("import-library", function () { el.importLibraryFile.click(); });
    el.importSessionFile.addEventListener("change", importSession);
    el.importLibraryFile.addEventListener("change", importLibrary);
    bindSetting(el.title, "input", "title", false);
    bindSetting(el.id, "input", "id", false);
    bindSetting(el.category, "change", "category", false);
    bindSetting(el.duration, "input", "durationMinutes", true);
    bindSetting(el.description, "input", "description", false);
    bindSetting(el.directions, "input", "directions", false);
    bindSetting(el.submission, "input", "submissionInstruction", false);
    el.listed.addEventListener("change", function () { currentSession().listed = el.listed.checked; refreshSessionSummary(); });
    renderAll();
    setStatus(savedDraft ? "Loaded the editing draft saved in this browser." : "Showing the currently published practice library.", "neutral");
  }

  function bindButton(id, handler) { document.getElementById(id).addEventListener("click", handler); }
  function bindSetting(control, eventName, property, numeric) {
    control.addEventListener(eventName, function () {
      currentSession()[property] = numeric ? Number(control.value) : control.value;
      refreshSessionSummary();
    });
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function normalizeLibrary(value) {
    var source = value && Array.isArray(value.sessions) ? value.sessions : [];
    return { version: 1, sessions: source.map(normalizeSession) };
  }

  function normalizeSession(value) {
    var session = value || {};
    return {
      id: String(session.id || ""),
      title: String(session.title || ""),
      category: ["Vocabulary", "Grammar", "Literature"].indexOf(session.category) >= 0 ? session.category : "Grammar",
      description: String(session.description || ""),
      directions: String(session.directions || ""),
      durationMinutes: Number(session.durationMinutes) || 10,
      listed: session.listed !== false,
      submissionInstruction: String(session.submissionInstruction || "Submit your results to the class Google Form."),
      questions: Array.isArray(session.questions) ? session.questions.map(normalizeQuestion) : []
    };
  }

  function normalizeQuestion(value) {
    var question = value || {};
    var choices = Array.isArray(question.choices) ? question.choices.slice(0, 4).map(String) : ["", ""];
    while (choices.length < 2) choices.push("");
    return {
      id: String(question.id || ""),
      prompt: String(question.prompt || ""),
      choices: choices,
      correctIndex: Number.isInteger(question.correctIndex) ? question.correctIndex : 0,
      explanation: String(question.explanation || ""),
      reviewTopic: String(question.reviewTopic || "")
    };
  }

  function loadDraft() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(draftKey));
      return parsed && Array.isArray(parsed.sessions) ? normalizeLibrary(parsed) : null;
    } catch (error) { return null; }
  }

  function currentSession() { return library.sessions[selectedIndex]; }

  function renderAll() {
    if (!library.sessions.length) {
      library.sessions.push(blankSession("practice-session"));
      selectedIndex = 0;
    }
    selectedIndex = Math.max(0, Math.min(selectedIndex, library.sessions.length - 1));
    renderSessionList();
    renderSettings();
    renderQuestions();
    renderValidation();
  }

  function renderSessionList() {
    el.sessionList.textContent = "";
    library.sessions.forEach(function (session, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "session-list-button" + (index === selectedIndex ? " active" : "");
      button.setAttribute("aria-pressed", index === selectedIndex ? "true" : "false");
      var category = document.createElement("span");
      category.textContent = session.category + (session.listed ? "" : " · Unlisted");
      var title = document.createElement("strong");
      title.textContent = session.title || "Untitled Session";
      button.appendChild(category);
      button.appendChild(title);
      button.addEventListener("click", function () { selectedIndex = index; renderAll(); el.editSessionHeading.focus(); });
      el.sessionList.appendChild(button);
    });
    el.sessionCount.textContent = String(library.sessions.length);
  }

  function renderSettings() {
    var session = currentSession();
    el.editSessionHeading.textContent = session.title || "Untitled Session";
    el.title.value = session.title;
    el.id.value = session.id;
    el.category.value = session.category;
    el.duration.value = String(session.durationMinutes);
    el.listed.checked = session.listed;
    el.description.value = session.description;
    el.directions.value = session.directions;
    el.submission.value = session.submissionInstruction;
  }

  function refreshSessionSummary() {
    el.editSessionHeading.textContent = currentSession().title || "Untitled Session";
    renderSessionList();
    renderValidation();
  }

  function renderQuestions(focusIndex) {
    var questions = currentSession().questions;
    el.questionList.textContent = "";
    el.questionCount.textContent = String(questions.length);
    questions.forEach(function (question, index) { el.questionList.appendChild(createQuestionCard(question, index, questions.length)); });
    if (typeof focusIndex === "number") {
      var target = el.questionList.querySelector("[data-question-index='" + focusIndex + "'] .edit-prompt");
      if (target) target.focus();
    }
  }

  function createQuestionCard(question, index, total) {
    var card = document.createElement("article");
    card.className = "question-edit-card";
    card.setAttribute("data-question-index", String(index));

    var header = document.createElement("div"); header.className = "question-card-header";
    var heading = document.createElement("h4"); heading.textContent = "Question " + (index + 1);
    var moves = document.createElement("div"); moves.className = "move-buttons";
    moves.appendChild(iconButton("↑", "Move question " + (index + 1) + " up", index === 0, function () { moveQuestion(index, -1); }));
    moves.appendChild(iconButton("↓", "Move question " + (index + 1) + " down", index === total - 1, function () { moveQuestion(index, 1); }));
    header.appendChild(heading); header.appendChild(moves); card.appendChild(header);

    var grid = document.createElement("div"); grid.className = "question-settings-grid";
    grid.appendChild(field("Question ID", textInput(question.id, "edit-question-id", function (value) { question.id = value; renderValidation(); }), "id-field"));
    var countSelect = document.createElement("select");
    [2, 3, 4].forEach(function (count) { var option = document.createElement("option"); option.value = String(count); option.textContent = count + " choices"; countSelect.appendChild(option); });
    countSelect.value = String(question.choices.length);
    countSelect.addEventListener("change", function () { changeChoiceCount(index, Number(countSelect.value)); });
    grid.appendChild(field("Number of Choices", countSelect, "choice-count-field"));
    grid.appendChild(field("Review Topic", textInput(question.reviewTopic, "edit-review-topic", function (value) { question.reviewTopic = value; }), "review-topic-field"));

    var prompt = document.createElement("textarea"); prompt.rows = 2; prompt.maxLength = 1000; prompt.className = "edit-prompt"; prompt.value = question.prompt;
    prompt.addEventListener("input", function () { question.prompt = prompt.value; renderValidation(); });
    grid.appendChild(field("Question or Prompt", prompt, "prompt-field"));

    var choices = document.createElement("div"); choices.className = "choices-grid";
    question.choices.forEach(function (choice, choiceIndex) {
      var row = document.createElement("div"); row.className = "choice-row";
      var radio = document.createElement("input"); radio.type = "radio"; radio.name = "correct-" + selectedIndex + "-" + index; radio.checked = question.correctIndex === choiceIndex;
      radio.setAttribute("aria-label", "Mark choice " + String.fromCharCode(65 + choiceIndex) + " as correct");
      radio.addEventListener("change", function () { question.correctIndex = choiceIndex; renderValidation(); });
      var input = textInput(choice, "edit-choice", function (value) { question.choices[choiceIndex] = value; renderValidation(); });
      input.setAttribute("aria-label", "Choice " + String.fromCharCode(65 + choiceIndex));
      input.placeholder = "Choice " + String.fromCharCode(65 + choiceIndex);
      row.appendChild(radio); row.appendChild(input); choices.appendChild(row);
    });
    grid.appendChild(field("Answer Choices — select the correct one", choices, "choices-field"));

    var explanation = document.createElement("textarea"); explanation.rows = 3; explanation.maxLength = 1500; explanation.value = question.explanation;
    explanation.addEventListener("input", function () { question.explanation = explanation.value; renderValidation(); });
    grid.appendChild(field("Instructional Explanation", explanation, "explanation-field"));
    card.appendChild(grid);

    var actions = document.createElement("div"); actions.className = "question-card-actions";
    actions.appendChild(actionButton("Duplicate", "button button-secondary", function () { duplicateQuestion(index); }));
    actions.appendChild(actionButton("Delete", "button button-danger", function () { deleteQuestion(index); }));
    card.appendChild(actions);
    return card;
  }

  function field(labelText, control, className) {
    var wrapper = document.createElement("div"); wrapper.className = "field-group " + (className || "");
    var label = document.createElement("label"); label.textContent = labelText;
    if (control.tagName !== "DIV") { var id = "field-" + Math.random().toString(36).slice(2); control.id = id; label.setAttribute("for", id); }
    wrapper.appendChild(label); wrapper.appendChild(control); return wrapper;
  }

  function textInput(value, className, onInput) {
    var input = document.createElement("input"); input.type = "text"; input.value = value; input.className = className || "";
    input.addEventListener("input", function () { onInput(input.value); }); return input;
  }

  function iconButton(text, label, disabled, handler) {
    var button = document.createElement("button"); button.type = "button"; button.className = "icon-button"; button.textContent = text; button.disabled = disabled; button.setAttribute("aria-label", label); button.addEventListener("click", handler); return button;
  }

  function actionButton(text, className, handler) { var button = document.createElement("button"); button.type = "button"; button.className = className; button.textContent = text; button.addEventListener("click", handler); return button; }

  function blankSession(id) {
    return {
      id: id,
      title: "New Practice Session",
      category: "Grammar",
      description: "A focused English practice session.",
      directions: "Read each question and choose the best answer. Review the explanation before moving on.",
      durationMinutes: 10,
      listed: false,
      submissionInstruction: "Submit your results to the class Google Form.",
      questions: [blankQuestion("q01")]
    };
  }

  function blankQuestion(id) { return { id: id, prompt: "", choices: ["", ""], correctIndex: 0, explanation: "", reviewTopic: "" }; }

  function addSession() {
    var session = blankSession(uniqueSessionId("new-practice-session"));
    library.sessions.push(session); selectedIndex = library.sessions.length - 1; renderAll(); setStatus("Added a new unlisted session. Complete and validate it before publishing.", "neutral"); el.title.focus();
  }

  function duplicateSession() {
    var copy = clone(currentSession());
    copy.id = uniqueSessionId(copy.id + "-copy");
    copy.title = copy.title + " — Copy";
    copy.listed = false;
    library.sessions.splice(selectedIndex + 1, 0, copy); selectedIndex += 1; renderAll(); setStatus("Duplicated the session as an unlisted copy.", "success");
  }

  function deleteSession() {
    if (library.sessions.length === 1) { window.alert("The library must keep at least one session."); return; }
    if (window.confirm("Delete “" + (currentSession().title || "this session") + "” from this editing copy?")) {
      library.sessions.splice(selectedIndex, 1); selectedIndex = Math.max(0, selectedIndex - 1); renderAll(); setStatus("Deleted the session from this editing copy.", "neutral");
    }
  }

  function uniqueSessionId(base) {
    var clean = slug(base) || "practice-session";
    var used = library.sessions.map(function (session) { return session.id; });
    if (used.indexOf(clean) === -1) return clean;
    var suffix = 2; while (used.indexOf(clean + "-" + suffix) >= 0) suffix += 1; return clean + "-" + suffix;
  }

  function slug(value) { return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function addQuestion() {
    var questions = currentSession().questions;
    questions.push(blankQuestion(uniqueQuestionId("q" + String(questions.length + 1).padStart(2, "0"))));
    renderQuestions(questions.length - 1); renderValidation(); setStatus("Added a blank question.", "neutral");
  }

  function duplicateQuestion(index) {
    var copy = clone(currentSession().questions[index]);
    copy.id = uniqueQuestionId(copy.id + "-copy");
    currentSession().questions.splice(index + 1, 0, copy); renderQuestions(index + 1); renderValidation(); setStatus("Duplicated the question with a new ID.", "success");
  }

  function deleteQuestion(index) {
    if (window.confirm("Delete question " + (index + 1) + " from this session?")) {
      currentSession().questions.splice(index, 1); renderQuestions(Math.min(index, currentSession().questions.length - 1)); renderValidation(); setStatus("Deleted the question.", "neutral");
    }
  }

  function moveQuestion(index, direction) {
    var questions = currentSession().questions;
    var destination = index + direction;
    if (destination < 0 || destination >= questions.length) return;
    var moved = questions.splice(index, 1)[0]; questions.splice(destination, 0, moved); renderQuestions(destination); renderValidation();
  }

  function changeChoiceCount(questionIndex, count) {
    var question = currentSession().questions[questionIndex];
    while (question.choices.length < count) question.choices.push("");
    question.choices = question.choices.slice(0, count);
    if (question.correctIndex >= count) question.correctIndex = 0;
    renderQuestions(questionIndex); renderValidation();
  }

  function uniqueQuestionId(base) {
    var clean = slug(base) || "question";
    var used = currentSession().questions.map(function (question) { return question.id; });
    if (used.indexOf(clean) === -1) return clean;
    var suffix = 2; while (used.indexOf(clean + "-" + suffix) >= 0) suffix += 1; return clean + "-" + suffix;
  }

  function validateLibrary() {
    var errors = [];
    var ids = Object.create(null);
    if (!library.sessions.length) errors.push("The library needs at least one session.");
    library.sessions.forEach(function (session, index) {
      validateSession(session, index).forEach(function (error) { errors.push(error); });
      if (session.id && ids[session.id]) errors.push("Session " + (index + 1) + ": the ID “" + session.id + "” is already used.");
      ids[session.id] = true;
    });
    return errors;
  }

  function validateSession(session, sessionIndex) {
    var errors = [];
    var label = "Session " + (sessionIndex + 1);
    if (!session.id.trim()) errors.push(label + ": the session ID is blank.");
    if (!session.title.trim()) errors.push(label + ": the title is blank.");
    if (!session.description.trim()) errors.push(label + ": the description is blank.");
    if (!session.directions.trim()) errors.push(label + ": the directions are blank.");
    if (!session.submissionInstruction.trim()) errors.push(label + ": the submission instruction is blank.");
    if (!["Vocabulary", "Grammar", "Literature"].includes(session.category)) errors.push(label + ": choose a valid category.");
    if (!Number.isFinite(session.durationMinutes) || session.durationMinutes < 1 || session.durationMinutes > 60) errors.push(label + ": minutes must be from 1 to 60.");
    if (!session.questions.length) errors.push(label + ": add at least one question.");
    var questionIds = Object.create(null);
    session.questions.forEach(function (question, questionIndex) {
      var q = label + ", question " + (questionIndex + 1);
      if (!question.id.trim()) errors.push(q + ": the question ID is blank.");
      else if (questionIds[question.id]) errors.push(q + ": the ID “" + question.id + "” is already used in this session.");
      else questionIds[question.id] = true;
      if (!question.prompt.trim()) errors.push(q + ": the prompt is blank.");
      if (question.choices.length < 2 || question.choices.length > 4 || question.choices.some(function (choice) { return !choice.trim(); })) errors.push(q + ": complete all 2–4 answer choices.");
      if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.choices.length) errors.push(q + ": select a correct answer.");
      if (!question.explanation.trim()) errors.push(q + ": the explanation is blank.");
    });
    return errors;
  }

  function renderValidation() {
    var errors = validateLibrary();
    el.validationErrors.textContent = "";
    if (!errors.length) {
      el.validationPanel.className = "validation-panel validation-valid";
      el.validationSummary.textContent = "Ready to publish";
      var valid = document.createElement("li"); valid.textContent = "No validation errors."; el.validationErrors.appendChild(valid);
      return;
    }
    el.validationPanel.className = "validation-panel validation-errors";
    el.validationSummary.textContent = errors.length + " error" + (errors.length === 1 ? "" : "s");
    errors.slice(0, 40).forEach(function (error) { var item = document.createElement("li"); item.textContent = error; el.validationErrors.appendChild(item); });
    if (errors.length > 40) { var more = document.createElement("li"); more.textContent = (errors.length - 40) + " additional errors are not shown."; el.validationErrors.appendChild(more); }
  }

  function saveDraft() {
    try { window.localStorage.setItem(draftKey, JSON.stringify(library)); setStatus("Editing draft saved in this browser. It is not yet published.", "success"); }
    catch (error) { setStatus("This browser could not save the draft. Export a library backup instead.", "error"); }
  }

  function clearDraft() {
    if (window.confirm("Clear the draft saved in this browser? Current on-screen edits will remain until this page is reloaded.")) {
      try { window.localStorage.removeItem(draftKey); setStatus("Cleared the saved draft. Current on-screen edits remain.", "success"); }
      catch (error) { setStatus("The saved draft could not be cleared.", "error"); }
    }
  }

  function resetLibrary() {
    if (window.confirm("Replace all current on-screen edits with the published practice library?")) {
      library = clone(publishedLibrary); selectedIndex = 0; renderAll(); setStatus("Reset to the currently published library.", "success"); window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function canPublish() {
    var errors = validateLibrary(); renderValidation();
    if (!errors.length) return true;
    setStatus("The library was not exported. Fix the validation errors first.", "error"); el.validationPanel.scrollIntoView({ block: "start" }); document.getElementById("validation-heading").focus(); return false;
  }

  function exportSession() {
    var errors = validateSession(currentSession(), selectedIndex);
    if (errors.length) { setStatus("The session was not exported. Fix its validation errors first.", "error"); renderValidation(); return; }
    download(slug(currentSession().title) + ".json", JSON.stringify(currentSession(), null, 2) + "\n", "application/json"); setStatus("Exported the current session as a JSON file.", "success");
  }

  function exportLibrary() {
    if (!canPublish()) return;
    download("practice-library-backup.json", JSON.stringify(library, null, 2) + "\n", "application/json"); setStatus("Exported a complete practice library backup.", "success");
  }

  function exportPublishable() {
    if (!canPublish()) return;
    download("practice-library.js", "window.PRACTICE_LIBRARY = " + JSON.stringify(library, null, 2) + ";\n", "text/javascript"); setStatus("Exported practice-library.js. Replace the old file in your upload folder and republish that folder.", "success");
  }

  function download(filename, content, type) {
    var url = URL.createObjectURL(new Blob([content], { type: type + ";charset=utf-8" }));
    var link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importSession() {
    readJsonFile(el.importSessionFile, function (parsed) {
      var source = parsed && parsed.session ? parsed.session : parsed;
      if (!source || Array.isArray(source) || typeof source !== "object") throw new Error("This file does not contain one practice session.");
      var session = normalizeSession(source); session.id = uniqueSessionId(session.id || session.title);
      if (!window.confirm("Import “" + (session.title || "this session") + "” into the current library?")) return;
      library.sessions.push(session); selectedIndex = library.sessions.length - 1; renderAll(); setStatus("Imported the session. Review validation before publishing.", "success");
    });
  }

  function importLibrary() {
    readJsonFile(el.importLibraryFile, function (parsed) {
      if (!parsed || !Array.isArray(parsed.sessions)) throw new Error("This file does not contain a complete practice library.");
      if (!window.confirm("Replace the current on-screen library with " + parsed.sessions.length + " imported sessions?")) return;
      library = normalizeLibrary(parsed); selectedIndex = 0; renderAll(); setStatus("Imported the practice library. Review validation before publishing.", "success"); window.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function readJsonFile(input, onSuccess) {
    var file = input.files && input.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.addEventListener("load", function () {
      try { onSuccess(JSON.parse(String(reader.result))); }
      catch (error) { setStatus("The file could not be imported: " + error.message, "error"); }
      input.value = "";
    });
    reader.addEventListener("error", function () { setStatus("The selected file could not be read.", "error"); input.value = ""; });
    reader.readAsText(file);
  }

  function previewSession() {
    if (!canPublish()) { setStatus("Fix validation errors before opening a preview.", "error"); return; }
    try { window.localStorage.setItem(draftKey, JSON.stringify(library)); }
    catch (error) { setStatus("This browser could not prepare the preview.", "error"); return; }
    var url = new URL("index.html?session=" + encodeURIComponent(currentSession().id) + "&teacherPreview=1", window.location.href).href;
    window.open(url, "_blank", "noopener"); setStatus("Saved this editing copy and opened a one-minute preview in a new tab.", "success");
  }

  function setStatus(message, kind) { el.status.textContent = message; el.status.className = "editor-status status-" + kind; }
}());
