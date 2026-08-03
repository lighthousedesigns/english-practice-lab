(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var requestedSessionId = params.get("session");
  var isTeacherPreview = params.get("teacherPreview") === "1";
  var draftKey = "mrReaPracticeHubDraft";
  var library = getLibrary();
  var selectedSession = null;
  var state = null;
  var timerInterval = null;
  var resultsForm = {
    url: "https://docs.google.com/forms/d/e/1FAIpQLScknuZPKiVto0siaxJHnY7RacZociqH6USG5PKFbqoKQ2kSGg/viewform",
    fields: {
      lastName: "entry.309227154",
      firstName: "entry.60527458",
      classPeriod: "entry.1018386785",
      session: "entry.1086419845",
      attempted: "entry.1542252984",
      correct: "entry.2031693750",
      incorrect: "entry.2142268151",
      accuracy: "entry.470351220",
      time: "entry.1586600608",
      streak: "entry.742419434",
      code: "entry.1642617159"
    }
  };

  var screens = {
    library: document.getElementById("library-screen"),
    start: document.getElementById("start-screen"),
    practice: document.getElementById("practice-screen"),
    results: document.getElementById("results-screen"),
    error: document.getElementById("error-screen")
  };

  var el = {
    sessionLibrary: document.getElementById("session-library"),
    emptyLibrary: document.getElementById("empty-library"),
    backToLibrary: document.getElementById("back-to-library"),
    sessionCategory: document.getElementById("session-category"),
    sessionTitle: document.getElementById("session-title"),
    sessionDescription: document.getElementById("session-description"),
    sessionDuration: document.getElementById("session-duration"),
    sessionDirections: document.getElementById("session-directions"),
    startForm: document.getElementById("start-form"),
    firstName: document.getElementById("first-name"),
    lastName: document.getElementById("last-name"),
    classPeriod: document.getElementById("class-period"),
    startPractice: document.getElementById("start-practice"),
    timer: document.getElementById("timer"),
    attempted: document.getElementById("attempted-count"),
    practiceCategory: document.getElementById("practice-category"),
    practiceTitle: document.getElementById("practice-title"),
    questionProgress: document.getElementById("question-progress-label"),
    prompt: document.getElementById("question-prompt"),
    answerGrid: document.getElementById("answer-grid"),
    feedback: document.getElementById("feedback"),
    feedbackSymbol: document.getElementById("feedback-symbol"),
    feedbackTitle: document.getElementById("feedback-title"),
    correctAnswer: document.getElementById("correct-answer"),
    feedbackExplanation: document.getElementById("feedback-explanation"),
    nextQuestion: document.getElementById("next-question"),
    endEarly: document.getElementById("end-early"),
    previewLabel: document.getElementById("preview-label"),
    resultSessionTitle: document.getElementById("result-session-title"),
    resultName: document.getElementById("result-name"),
    resultPeriodWrap: document.getElementById("result-period-wrap"),
    resultPeriod: document.getElementById("result-period"),
    resultDate: document.getElementById("result-date"),
    resultTime: document.getElementById("result-time"),
    resultAttempted: document.getElementById("result-attempted"),
    resultCorrect: document.getElementById("result-correct"),
    resultIncorrect: document.getElementById("result-incorrect"),
    resultStreak: document.getElementById("result-streak"),
    resultAccuracy: document.getElementById("result-accuracy"),
    reviewList: document.getElementById("review-list"),
    skillResults: document.getElementById("skill-results"),
    sessionCode: document.getElementById("session-code"),
    submissionInstruction: document.getElementById("submission-instruction"),
    submitResults: document.getElementById("submit-results"),
    savePdf: document.getElementById("save-pdf"),
    repeatSession: document.getElementById("repeat-session"),
    chooseSession: document.getElementById("choose-session")
  };

  initialize();

  function initialize() {
    var errors = validateLibrary(library);
    if (errors.length) {
      showError(errors[0]);
      return;
    }

    el.startForm.addEventListener("submit", startSession);
    el.backToLibrary.addEventListener("click", returnToLibrary);
    el.nextQuestion.addEventListener("click", advanceOrFinish);
    el.endEarly.addEventListener("click", endEarly);
    el.submitResults.addEventListener("click", submitResults);
    el.savePdf.addEventListener("click", function () { window.print(); });
    el.repeatSession.addEventListener("click", repeatSession);
    el.chooseSession.addEventListener("click", chooseAnotherSession);
    document.addEventListener("visibilitychange", checkTimer);

    selectedSession = findSession(requestedSessionId);
    if (isTeacherPreview && !selectedSession) {
      selectedSession = library.sessions[0];
    }

    var restored = selectedSession ? loadState(selectedSession.id) : null;
    if (restored && restored.sessionId === selectedSession.id && (restored.firstName || restored.studentName)) {
      state = restored;
      repairState();
      if (state.status === "results") {
        renderResults();
      } else {
        checkTimer();
        renderPractice();
        startTimer();
      }
      return;
    }

    if (selectedSession) {
      renderStart();
    } else {
      renderLibrary();
    }
  }

  function getLibrary() {
    var published = clone(window.PRACTICE_LIBRARY || { version: 1, sessions: [] });
    if (!isTeacherPreview) {
      return published;
    }
    try {
      var draft = JSON.parse(window.localStorage.getItem(draftKey));
      if (draft && validateLibrary(draft).length === 0) {
        return clone(draft);
      }
    } catch (error) {
      // Preview falls back to the published library.
    }
    return published;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validateLibrary(candidate) {
    var errors = [];
    if (!candidate || !Array.isArray(candidate.sessions) || candidate.sessions.length === 0) {
      return ["The practice library must contain at least one session."];
    }
    var sessionIds = Object.create(null);
    candidate.sessions.forEach(function (session, sessionIndex) {
      var label = "Session " + (sessionIndex + 1);
      if (!session || !String(session.id || "").trim()) errors.push(label + " needs an ID.");
      else if (sessionIds[session.id]) errors.push("Session IDs must be unique: " + session.id);
      else sessionIds[session.id] = true;
      if (!String(session.title || "").trim()) errors.push(label + " needs a title.");
      if (["Vocabulary", "Grammar", "Literature"].indexOf(session.category) === -1) errors.push(label + " needs a valid category.");
      if (!Number.isFinite(Number(session.durationMinutes)) || Number(session.durationMinutes) < 1 || Number(session.durationMinutes) > 60) errors.push(label + " needs a duration from 1 to 60 minutes.");
      if (!Array.isArray(session.questions) || session.questions.length === 0) {
        errors.push(label + " needs at least one question.");
        return;
      }
      var questionIds = Object.create(null);
      session.questions.forEach(function (question, questionIndex) {
        var qLabel = label + ", question " + (questionIndex + 1);
        if (!question || !String(question.id || "").trim()) errors.push(qLabel + " needs an ID.");
        else if (questionIds[question.id]) errors.push(qLabel + " repeats an ID.");
        else questionIds[question.id] = true;
        if (!String(question.prompt || "").trim()) errors.push(qLabel + " needs a prompt.");
        if (!Array.isArray(question.choices) || question.choices.length < 2 || question.choices.length > 4 || question.choices.some(function (choice) { return !String(choice || "").trim(); })) errors.push(qLabel + " needs 2–4 complete answer choices.");
        if (!Number.isInteger(question.correctIndex) || !question.choices || question.correctIndex < 0 || question.correctIndex >= question.choices.length) errors.push(qLabel + " needs a valid correct answer.");
        if (!String(question.explanation || "").trim()) errors.push(qLabel + " needs an explanation.");
      });
    });
    return errors;
  }

  function renderLibrary() {
    selectedSession = null;
    showOnly("library");
    el.sessionLibrary.textContent = "";
    var listed = library.sessions.filter(function (session) { return session.listed !== false; });
    el.emptyLibrary.hidden = listed.length > 0;
    ["Vocabulary", "Grammar", "Literature"].forEach(function (category) {
      var sessions = listed.filter(function (session) { return session.category === category; });
      if (!sessions.length) return;
      var section = document.createElement("section");
      section.className = "category-section";
      var heading = document.createElement("h3");
      heading.textContent = category;
      var grid = document.createElement("div");
      grid.className = "session-card-grid";
      sessions.forEach(function (session) { grid.appendChild(createSessionCard(session)); });
      section.appendChild(heading);
      section.appendChild(grid);
      el.sessionLibrary.appendChild(section);
    });
  }

  function createSessionCard(session) {
    var card = document.createElement("article");
    card.className = "session-card";
    card.setAttribute("data-category", session.category);
    var category = document.createElement("p");
    category.className = "eyebrow";
    category.textContent = session.category;
    var title = document.createElement("h4");
    title.textContent = session.title;
    var description = document.createElement("p");
    description.textContent = session.description;
    var footer = document.createElement("div");
    footer.className = "card-footer";
    var details = document.createElement("span");
    details.textContent = session.durationMinutes + " min · " + session.questions.length + " questions";
    var button = document.createElement("button");
    button.className = "button button-primary";
    button.type = "button";
    button.textContent = "Start Practice";
    button.setAttribute("aria-label", "Start " + session.title);
    button.addEventListener("click", function () {
      selectedSession = session;
      setSessionInAddress(session.id);
      renderStart();
    });
    footer.appendChild(details);
    footer.appendChild(button);
    card.appendChild(category);
    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(footer);
    return card;
  }

  function renderStart() {
    showOnly("start");
    el.backToLibrary.hidden = isTeacherPreview;
    el.sessionCategory.textContent = isTeacherPreview ? "Teacher Preview — 1 Minute" : selectedSession.category;
    el.sessionTitle.textContent = selectedSession.title;
    el.sessionDescription.textContent = selectedSession.description;
    el.sessionDuration.textContent = isTeacherPreview ? "1 minute" : selectedSession.durationMinutes + " minutes";
    el.sessionDirections.textContent = selectedSession.directions;
    el.startPractice.textContent = isTeacherPreview ? "Start 1-Minute Preview" : "Start " + selectedSession.durationMinutes + "-Minute Practice";
    el.firstName.focus();
  }

  function returnToLibrary() {
    clearState(selectedSession.id);
    removeSessionFromAddress();
    renderLibrary();
  }

  function startSession(event) {
    event.preventDefault();
    if (!el.startForm.reportValidity()) return;
    var seconds = isTeacherPreview ? 60 : Number(selectedSession.durationMinutes) * 60;
    var now = Date.now();
    state = {
      version: 1,
      sessionId: selectedSession.id,
      preview: isTeacherPreview,
      durationSeconds: seconds,
      status: "question",
      firstName: el.firstName.value.trim(),
      lastName: el.lastName.value.trim(),
      classPeriod: el.classPeriod.value.trim(),
      startTime: now,
      deadline: now + seconds * 1000,
      endedAt: null,
      timeExpired: false,
      queue: [],
      currentId: null,
      lastQuestionId: null,
      attempts: [],
      correct: 0,
      incorrect: 0,
      currentStreak: 0,
      longestStreak: 0,
      code: ""
    };
    chooseNextQuestion();
    saveState();
    renderPractice();
    startTimer();
    el.prompt.focus();
  }

  function chooseNextQuestion() {
    if (state.queue.length === 0) {
      var ids = shuffle(selectedSession.questions.map(function (question) { return question.id; }));
      if (ids.length > 1 && ids[0] === state.lastQuestionId) {
        var temporary = ids[0]; ids[0] = ids[1]; ids[1] = temporary;
      }
      state.queue = ids;
    }
    state.currentId = state.queue.shift();
    state.lastQuestionId = state.currentId;
    state.status = "question";
  }

  function shuffle(items) {
    var result = items.slice();
    for (var index = result.length - 1; index > 0; index -= 1) {
      var randomIndex = Math.floor(Math.random() * (index + 1));
      var temporary = result[index]; result[index] = result[randomIndex]; result[randomIndex] = temporary;
    }
    return result;
  }

  function renderPractice() {
    showOnly("practice");
    var question = findQuestion(state.currentId);
    if (!question) { showError("A saved session refers to a question that is no longer in this library."); return; }
    el.practiceCategory.textContent = selectedSession.category;
    el.practiceTitle.textContent = selectedSession.title;
    el.attempted.textContent = String(state.attempts.length);
    el.questionProgress.textContent = "Question " + (state.attempts.length + (state.status === "feedback" ? 0 : 1));
    el.prompt.textContent = question.prompt;
    el.answerGrid.textContent = "";
    question.choices.forEach(function (choice, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "answer-choice";
      button.disabled = state.status === "feedback";
      button.setAttribute("data-choice-index", String(index));
      var letter = document.createElement("span");
      letter.className = "answer-letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = String.fromCharCode(65 + index);
      var text = document.createElement("span");
      text.className = "answer-text";
      text.textContent = choice;
      button.appendChild(letter);
      button.appendChild(text);
      button.addEventListener("click", answerQuestion);
      el.answerGrid.appendChild(button);
    });

    el.feedback.hidden = state.status !== "feedback";
    if (state.status === "feedback") {
      var attempt = state.attempts[state.attempts.length - 1];
      el.feedback.className = "feedback " + (attempt.correct ? "feedback-correct" : "feedback-incorrect");
      el.feedbackSymbol.textContent = attempt.correct ? "✓" : "!";
      el.feedbackTitle.textContent = attempt.correct ? "Correct" : "Not quite.";
      el.correctAnswer.textContent = "Correct answer: " + question.choices[question.correctIndex];
      el.feedbackExplanation.textContent = question.explanation;
      el.nextQuestion.textContent = state.timeExpired ? "View Results" : "Next Question";
    }
    updateTimer();
  }

  function answerQuestion(event) {
    if (!state || state.status !== "question") return;
    checkTimer();
    var question = findQuestion(state.currentId);
    var choiceIndex = Number(event.currentTarget.getAttribute("data-choice-index"));
    var correct = choiceIndex === question.correctIndex;
    if (correct) {
      state.correct += 1;
      state.currentStreak += 1;
      state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
    } else {
      state.incorrect += 1;
      state.currentStreak = 0;
    }
    state.attempts.push({
      questionId: question.id,
      choiceIndex: choiceIndex,
      correctIndex: question.correctIndex,
      correct: correct,
      reviewTopic: question.reviewTopic || "General review",
      answeredAt: Date.now()
    });
    state.status = "feedback";
    saveState();
    renderPractice();
    el.nextQuestion.focus();
  }

  function advanceOrFinish() {
    if (!state || state.status !== "feedback") return;
    checkTimer();
    if (state.timeExpired) { finishSession(state.deadline); return; }
    chooseNextQuestion();
    saveState();
    renderPractice();
    el.prompt.focus();
  }

  function startTimer() {
    stopTimer();
    updateTimer();
    timerInterval = window.setInterval(checkTimer, 250);
  }

  function stopTimer() {
    if (timerInterval !== null) { window.clearInterval(timerInterval); timerInterval = null; }
  }

  function checkTimer() {
    if (!state || state.status === "results") return;
    if (Date.now() >= state.deadline) {
      if (!state.timeExpired) { state.timeExpired = true; saveState(); }
      updateTimer();
      if (state.status === "feedback") el.nextQuestion.textContent = "View Results";
      stopTimer();
      return;
    }
    updateTimer();
  }

  function updateTimer() {
    if (!state) return;
    var remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    var minutes = Math.floor(remaining / 60);
    var seconds = remaining % 60;
    el.timer.textContent = minutes + ":" + String(seconds).padStart(2, "0");
    el.timer.setAttribute("aria-label", "Time remaining: " + minutes + " minutes and " + seconds + " seconds");
    el.timer.classList.toggle("timer-low", remaining <= 60);
  }

  function endEarly() {
    if (window.confirm("End this practice session now and view your results?")) finishSession(Date.now());
  }

  function finishSession(endTime) {
    stopTimer();
    state.endedAt = Math.min(endTime || Date.now(), state.deadline);
    state.status = "results";
    state.timeExpired = state.endedAt >= state.deadline;
    if (!state.code) state.code = makeCode();
    saveState();
    renderResults();
  }

  function renderResults() {
    stopTimer();
    showOnly("results");
    var attempted = state.attempts.length;
    var accuracy = percentage(state.correct, attempted);
    var date = new Date(state.endedAt || Date.now());
    el.previewLabel.hidden = !state.preview;
    el.resultSessionTitle.textContent = selectedSession.title;
    el.resultName.textContent = [state.firstName, state.lastName].filter(Boolean).join(" ");
    el.resultPeriodWrap.hidden = !state.classPeriod;
    el.resultPeriod.textContent = state.classPeriod;
    el.resultDate.textContent = date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    el.resultTime.textContent = formatElapsed(elapsedSeconds());
    el.resultAttempted.textContent = String(attempted);
    el.resultCorrect.textContent = String(state.correct);
    el.resultIncorrect.textContent = String(state.incorrect);
    el.resultStreak.textContent = String(state.longestStreak);
    el.resultAccuracy.textContent = accuracy + "%";
    el.sessionCode.textContent = state.code;
    el.submissionInstruction.textContent = "Select Submit Results, review the information in the Google Form, and click Submit.";
    renderSkillResults();
    document.getElementById("results-heading").focus();
  }

  function renderSkillResults() {
    var skills = Object.create(null);
    state.attempts.forEach(function (attempt) {
      var name = attempt.reviewTopic || "General review";
      if (!skills[name]) skills[name] = { attempted: 0, correct: 0 };
      skills[name].attempted += 1;
      if (attempt.correct) skills[name].correct += 1;
    });
    var names = Object.keys(skills);
    el.skillResults.textContent = "";
    el.reviewList.textContent = "";
    var needsReview = [];
    if (!names.length) {
      var noSkill = document.createElement("p");
      noSkill.className = "skill-row";
      noSkill.textContent = "No questions attempted";
      el.skillResults.appendChild(noSkill);
      needsReview.push("Review the session directions before trying again.");
    }
    names.forEach(function (name) {
      var stats = skills[name];
      var row = document.createElement("div");
      row.className = "skill-row";
      var label = document.createElement("span"); label.textContent = name;
      var value = document.createElement("strong"); value.textContent = stats.correct + " of " + stats.attempted;
      row.appendChild(label); row.appendChild(value); el.skillResults.appendChild(row);
      if (percentage(stats.correct, stats.attempted) < 80) needsReview.push(name + ".");
    });
    if (names.length && !needsReview.length) needsReview.push("Continue building speed and confidence with this session.");
    needsReview.forEach(function (text) { var item = document.createElement("li"); item.textContent = text; el.reviewList.appendChild(item); });
  }

  function percentage(correct, attempted) { return attempted ? Math.round(correct / attempted * 100) : 0; }
  function elapsedSeconds() { var end = state.endedAt || Math.min(Date.now(), state.deadline); return Math.max(0, Math.min(state.durationSeconds, Math.round((end - state.startTime) / 1000))); }
  function formatElapsed(seconds) { var minutes = Math.floor(seconds / 60); var remainder = seconds % 60; return minutes ? minutes + " min " + remainder + " sec" : remainder + " second" + (remainder === 1 ? "" : "s"); }

  function submitResults() {
    if (!state || state.status !== "results") return;
    var attempted = state.attempts.length;
    var values = {
      lastName: state.lastName || "",
      firstName: state.firstName || "",
      classPeriod: formatClassPeriod(state.classPeriod),
      session: selectedSession.title,
      attempted: attempted,
      correct: state.correct,
      incorrect: state.incorrect,
      accuracy: percentage(state.correct, attempted) + "%",
      time: formatElapsed(elapsedSeconds()),
      streak: state.longestStreak,
      code: state.code
    };
    var url = new URL(resultsForm.url);
    url.searchParams.set("usp", "pp_url");
    Object.keys(resultsForm.fields).forEach(function (key) {
      url.searchParams.set(resultsForm.fields[key], String(values[key]));
    });
    window.open(url.href, "_blank", "noopener");
  }

  function formatClassPeriod(value) {
    var period = String(value || "").trim();
    return /^\d+$/.test(period) ? "Period " + period : period;
  }

  function makeCode() {
    var characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var values = new Uint32Array(8);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(values);
    else for (var index = 0; index < values.length; index += 1) values[index] = Math.floor(Math.random() * 100000);
    var code = "";
    for (var codeIndex = 0; codeIndex < values.length; codeIndex += 1) code += characters.charAt(values[codeIndex] % characters.length);
    return code;
  }

  function repeatSession() {
    if (!window.confirm("Have you submitted your results or saved them as a PDF? Starting again will clear these results from this tab.")) return;
    clearState(selectedSession.id);
    state = null;
    el.firstName.value = "";
    el.lastName.value = "";
    el.classPeriod.value = "";
    renderStart();
  }

  function chooseAnotherSession() {
    if (!window.confirm("Have you submitted your results or saved them as a PDF? Choosing another session will clear these results from this tab.")) return;
    clearState(selectedSession.id);
    state = null;
    removeSessionFromAddress();
    renderLibrary();
  }

  function findSession(id) { return library.sessions.find(function (session) { return session.id === id; }) || null; }
  function findQuestion(id) { return selectedSession.questions.find(function (question) { return question.id === id; }) || null; }
  function storageKey(sessionId) { return "mrReaHubSession:" + sessionId + (isTeacherPreview ? ":preview" : ""); }
  function saveState() { try { window.sessionStorage.setItem(storageKey(selectedSession.id), JSON.stringify(state)); } catch (error) {} }
  function loadState(sessionId) { try { return JSON.parse(window.sessionStorage.getItem(storageKey(sessionId))); } catch (error) { return null; } }
  function clearState(sessionId) { try { window.sessionStorage.removeItem(storageKey(sessionId)); } catch (error) {} }

  function repairState() {
    state.queue = Array.isArray(state.queue) ? state.queue : [];
    state.attempts = Array.isArray(state.attempts) ? state.attempts : [];
    if (!state.firstName && state.studentName) state.firstName = state.studentName;
    state.firstName = String(state.firstName || "");
    state.lastName = String(state.lastName || "");
    state.correct = Number(state.correct) || 0;
    state.incorrect = Number(state.incorrect) || 0;
    state.currentStreak = Number(state.currentStreak) || 0;
    state.longestStreak = Number(state.longestStreak) || 0;
    if (!state.durationSeconds) state.durationSeconds = isTeacherPreview ? 60 : selectedSession.durationMinutes * 60;
    if (!state.currentId && state.status !== "results") chooseNextQuestion();
    if (state.status === "results" && !state.code) { state.code = makeCode(); saveState(); }
  }

  function setSessionInAddress(id) {
    try { window.history.replaceState(null, "", window.location.pathname + "?session=" + encodeURIComponent(id)); } catch (error) {}
  }
  function removeSessionFromAddress() {
    try { window.history.replaceState(null, "", window.location.pathname); } catch (error) {}
  }
  function showOnly(name) { Object.keys(screens).forEach(function (key) { screens[key].hidden = key !== name; }); }
  function showError(message) { stopTimer(); showOnly("error"); document.getElementById("error-message").textContent = message; }
}());
