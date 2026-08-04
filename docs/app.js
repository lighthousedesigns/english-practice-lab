(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var requestedSessionId = params.get("session");
  var appConfig = window.ENGLISH_PRACTICE_CONFIG || {};
  var library = clone(window.PRACTICE_LIBRARY || { version: 1, sessions: [] });
  var selectedSession = null;
  var state = null;
  var timerInterval = null;
  var resultsForm = appConfig.resultsForm || {};

  var screens = {
    assignment: document.getElementById("assignment-screen"),
    start: document.getElementById("start-screen"),
    practice: document.getElementById("practice-screen"),
    results: document.getElementById("results-screen"),
    error: document.getElementById("error-screen")
  };

  var el = {
    productName: document.getElementById("product-name"),
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
    questionInstruction: document.getElementById("question-instruction"),
    prompt: document.getElementById("question-prompt"),
    answerGrid: document.getElementById("answer-grid"),
    feedback: document.getElementById("feedback"),
    feedbackSymbol: document.getElementById("feedback-symbol"),
    feedbackTitle: document.getElementById("feedback-title"),
    correctAnswer: document.getElementById("correct-answer"),
    feedbackExplanation: document.getElementById("feedback-explanation"),
    nextQuestion: document.getElementById("next-question"),
    endEarly: document.getElementById("end-early"),
    resultSessionTitle: document.getElementById("result-session-title"),
    resultsHeading: document.getElementById("results-heading"),
    resultName: document.getElementById("result-name"),
    resultPeriodWrap: document.getElementById("result-period-wrap"),
    resultPeriod: document.getElementById("result-period"),
    resultDate: document.getElementById("result-date"),
    resultTime: document.getElementById("result-time"),
    resultScore: document.getElementById("result-score"),
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
    errorHeading: document.getElementById("error-heading")
  };

  initialize();

  function initialize() {
    applyProductBranding();
    var errors = validateLibrary(library);
    if (errors.length) {
      showError(errors[0]);
      return;
    }
    var configErrors = validateConfig(appConfig);
    if (configErrors.length) {
      showError(configErrors[0]);
      return;
    }

    el.startForm.addEventListener("submit", startSession);
    el.nextQuestion.addEventListener("click", advanceOrFinish);
    el.endEarly.addEventListener("click", endEarly);
    el.savePdf.addEventListener("click", function () { window.print(); });
    el.repeatSession.addEventListener("click", repeatSession);
    document.addEventListener("visibilitychange", checkTimer);

    selectedSession = findSession(requestedSessionId);
    if (requestedSessionId && !selectedSession) {
      showError("This activity link is not valid. Please check the link or ask your teacher for the correct one.", "Practice activity not found");
      return;
    }

    var restored = selectedSession ? loadState(selectedSession.id) : null;
    if (restored && restored.sessionId === selectedSession.id && (restored.firstName || restored.studentName)) {
      state = restored;
      repairState();
      if (state.status === "results") {
        renderResults();
      } else {
        checkTimer();
        if (state.status !== "results") {
          renderPractice();
          startTimer();
        }
      }
      return;
    }

    if (selectedSession) {
      renderStart();
    } else {
      showOnly("assignment");
    }
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
      if (!String(session.course || "").trim()) errors.push(label + " needs a course.");
      if (!String(session.category || "").trim()) errors.push(label + " needs a category.");
      if (!String(session.description || "").trim()) errors.push(label + " needs a description.");
      if (!String(session.directions || "").trim()) errors.push(label + " needs directions.");
      if (typeof session.listed !== "boolean") errors.push(label + " needs a listed value.");
      if (!String(session.submissionInstruction || "").trim()) errors.push(label + " needs a submission instruction.");
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
        if (!String(question.explanation || "").trim()) errors.push(qLabel + " needs an explanation.");
        validateQuestion(question, qLabel, errors);
      });
    });
    return errors;
  }

  function validateQuestion(question, label, errors) {
    var type = questionType(question);
    if (type === "multiple-choice") {
      if (!Array.isArray(question.choices) || question.choices.length < 2 || question.choices.length > 4 || question.choices.some(function (choice) { return !String(choice || "").trim(); })) errors.push(label + " needs 2–4 complete answer choices.");
      if (!Number.isInteger(question.correctIndex) || !question.choices || question.correctIndex < 0 || question.correctIndex >= question.choices.length) errors.push(label + " needs a valid correct answer.");
      return;
    }
    if (type !== "classification") {
      errors.push(label + " uses an unsupported question type: " + type + ".");
      return;
    }
    if (!Array.isArray(question.categories) || question.categories.length < 2 || question.categories.length > 6) {
      errors.push(label + " needs 2–6 classification categories.");
      return;
    }
    var categoryIds = Object.create(null);
    question.categories.forEach(function (category) {
      if (!category || !String(category.id || "").trim() || !String(category.label || "").trim()) errors.push(label + " has an incomplete classification category.");
      else if (categoryIds[category.id]) errors.push(label + " repeats classification category ID " + category.id + ".");
      else categoryIds[category.id] = true;
    });
    if (!Array.isArray(question.items) || question.items.length < 2 || question.items.length > 12) {
      errors.push(label + " needs 2–12 classification items.");
      return;
    }
    var itemIds = Object.create(null);
    question.items.forEach(function (item) {
      if (!item || !String(item.id || "").trim() || !String(item.text || "").trim()) errors.push(label + " has an incomplete classification item.");
      else if (itemIds[item.id]) errors.push(label + " repeats classification item ID " + item.id + ".");
      else itemIds[item.id] = true;
      if (!item || !categoryIds[item.correctCategoryId]) errors.push(label + " has an item whose correctCategoryId does not match a category.");
    });
  }

  function questionType(question) {
    return question && question.type ? question.type : "multiple-choice";
  }

  function validateConfig(candidate) {
    var requiredFields = ["lastName", "firstName", "classPeriod", "session", "attempted", "correct", "incorrect", "accuracy", "time", "streak", "code"];
    if (!candidate || !String(candidate.productName || "").trim()) {
      return ["The product name is missing from config.js."];
    }
    if (!candidate || !candidate.resultsForm || !String(candidate.resultsForm.url || "").trim()) {
      return ["The results Form URL is missing from config.js."];
    }
    if (!candidate.resultsForm.fields || requiredFields.some(function (key) { return !String(candidate.resultsForm.fields[key] || "").trim(); })) {
      return ["One or more results Form fields are missing from config.js."];
    }
    return [];
  }

  function applyProductBranding() {
    var productName = String(appConfig.productName || "").trim();
    document.title = productName;
    el.productName.textContent = productName;
    el.resultsHeading.textContent = productName;
  }

  function renderStart() {
    showOnly("start");
    el.sessionCategory.textContent = selectedSession.course + " · " + selectedSession.category;
    el.sessionTitle.textContent = selectedSession.title;
    el.sessionDescription.textContent = selectedSession.description;
    el.sessionDuration.textContent = selectedSession.durationMinutes + " minutes";
    el.sessionDirections.textContent = selectedSession.directions;
    el.startPractice.textContent = "Start " + selectedSession.durationMinutes + "-Minute Practice";
    el.firstName.focus();
  }

  function startSession(event) {
    event.preventDefault();
    if (!el.startForm.reportValidity()) return;
    var seconds = Number(selectedSession.durationMinutes) * 60;
    var now = Date.now();
    state = {
      version: 2,
      sessionId: selectedSession.id,
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
      response: null,
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
    state.response = null;
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
    el.practiceCategory.textContent = selectedSession.course + " · " + selectedSession.category;
    el.practiceTitle.textContent = selectedSession.title;
    el.attempted.textContent = String(totalPointsPossible());
    el.questionProgress.textContent = "Question " + (state.attempts.length + (state.status === "feedback" ? 0 : 1));
    el.prompt.textContent = question.prompt;
    el.answerGrid.textContent = "";
    el.feedback.hidden = true;
    if (questionType(question) === "classification") renderClassification(question);
    else renderMultipleChoice(question);

    if (state.status === "feedback") renderQuestionFeedback(question);
    updateTimer();
  }

  function renderMultipleChoice(question) {
    el.questionInstruction.textContent = "Choose the best answer";
    el.answerGrid.className = "answer-grid";
    el.answerGrid.setAttribute("aria-label", "Answer choices");
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
  }

  function renderQuestionFeedback(question) {
    var attempt = state.attempts[state.attempts.length - 1];
    el.feedback.hidden = false;
    el.feedback.className = "feedback " + (attempt.correct ? "feedback-correct" : "feedback-incorrect");
    el.feedbackSymbol.textContent = attempt.correct ? "✓" : "!";
    if (questionType(question) === "classification") {
      el.feedbackTitle.textContent = attempt.correct ? "Correct on the first check" : "All items corrected";
      el.correctAnswer.textContent = "First check: " + attempt.pointsEarned + " of " + attempt.pointsPossible + " items correct.";
    } else {
      el.feedbackTitle.textContent = attempt.correct ? "Correct" : "Not quite.";
      el.correctAnswer.textContent = "Correct answer: " + question.choices[question.correctIndex];
    }
    el.feedbackExplanation.textContent = question.explanation;
    el.nextQuestion.textContent = state.timeExpired ? "View Results" : "Next Question";
  }

  function answerQuestion(event) {
    if (!state || state.status !== "question") return;
    checkTimer();
    if (!state || state.status === "results") return;
    var question = findQuestion(state.currentId);
    var choiceIndex = Number(event.currentTarget.getAttribute("data-choice-index"));
    var correct = choiceIndex === question.correctIndex;
    recordAttempt({
      questionId: question.id,
      type: "multiple-choice",
      choiceIndex: choiceIndex,
      correctIndex: question.correctIndex,
      correct: correct,
      firstAttemptCorrect: correct,
      attemptCount: 1,
      pointsEarned: correct ? 1 : 0,
      pointsPossible: 1,
      reviewTopic: question.reviewTopic || "General review",
      answeredAt: Date.now()
    });
    completeQuestion();
  }

  function renderClassification(question) {
    var response = classificationResponse(question);
    el.questionInstruction.textContent = "Classify every item";
    el.answerGrid.className = "classification-interaction";
    el.answerGrid.setAttribute("aria-label", "Classification activity");

    var instructions = document.createElement("p");
    instructions.className = "classification-instructions";
    instructions.textContent = "Drag an item, or select it and then choose a category. Keyboard users can press Enter or Space on an item and a category.";
    el.answerGrid.appendChild(instructions);

    var status = document.createElement("p");
    status.className = "classification-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = classificationStatus(question, response);
    el.answerGrid.appendChild(status);

    var bank = document.createElement("section");
    bank.className = "classification-bank";
    bank.setAttribute("aria-label", "Items not yet placed");
    var bankHeading = document.createElement("h3");
    bankHeading.textContent = "Items to classify";
    bank.appendChild(bankHeading);
    var bankItems = document.createElement("div");
    bankItems.className = "classification-items";
    var unplaced = question.items.filter(function (item) { return !response.placements[item.id]; });
    if (!unplaced.length) {
      var empty = document.createElement("p");
      empty.className = "classification-empty";
      empty.textContent = "All items are placed.";
      bankItems.appendChild(empty);
    }
    unplaced.forEach(function (item) { bankItems.appendChild(classificationItemButton(item, response)); });
    bank.appendChild(bankItems);
    el.answerGrid.appendChild(bank);

    var categories = document.createElement("div");
    categories.className = "classification-categories";
    question.categories.forEach(function (category) {
      var target = document.createElement("section");
      target.className = "classification-category";
      target.setAttribute("data-category-id", category.id);
      target.setAttribute("role", "button");
      target.setAttribute("tabindex", state.status === "feedback" ? "-1" : "0");
      target.setAttribute("aria-label", "Place selected item in " + category.label);
      var heading = document.createElement("h3");
      heading.textContent = category.label;
      target.appendChild(heading);
      var placedItems = document.createElement("div");
      placedItems.className = "classification-items";
      question.items.filter(function (item) { return response.placements[item.id] === category.id; }).forEach(function (item) {
        placedItems.appendChild(classificationItemButton(item, response));
      });
      target.appendChild(placedItems);
      target.addEventListener("click", chooseClassificationCategory);
      target.addEventListener("keydown", classificationCategoryKeydown);
      target.addEventListener("dragover", classificationDragover);
      target.addEventListener("drop", classificationDrop);
      categories.appendChild(target);
    });
    el.answerGrid.appendChild(categories);

    var actions = document.createElement("div");
    actions.className = "classification-actions";
    var clear = document.createElement("button");
    clear.type = "button";
    clear.className = "button button-secondary";
    clear.setAttribute("data-classification-action", "clear");
    clear.textContent = "Clear Movable Items";
    clear.disabled = state.status === "feedback" || !hasMovablePlacement(question, response);
    clear.addEventListener("click", clearClassificationPlacements);
    actions.appendChild(clear);
    var check = document.createElement("button");
    check.type = "button";
    check.className = "button button-primary";
    check.setAttribute("data-classification-action", "check");
    check.textContent = response.checkCount ? "Check Corrections" : "Check Classification";
    check.disabled = state.status === "feedback" || question.items.some(function (item) { return !response.placements[item.id]; });
    check.addEventListener("click", checkClassification);
    actions.appendChild(check);
    el.answerGrid.appendChild(actions);
  }

  function classificationResponse(question) {
    if (!state.response || state.response.type !== "classification" || state.response.questionId !== question.id) {
      state.response = {
        type: "classification",
        questionId: question.id,
        placements: {},
        selectedItemId: null,
        evaluated: {},
        firstItemCorrect: null,
        firstPointsEarned: null,
        checkCount: 0
      };
    }
    return state.response;
  }

  function classificationItemButton(item, response) {
    var button = document.createElement("button");
    var locked = response.evaluated[item.id] === true;
    var result = response.evaluated[item.id];
    button.type = "button";
    button.className = "classification-item" + (response.placements[item.id] ? " is-placed" : "") + (response.selectedItemId === item.id ? " is-selected" : "") + (result === true ? " is-correct" : "") + (result === false ? " is-incorrect" : "");
    button.textContent = item.text;
    button.disabled = state.status === "feedback" || locked;
    button.draggable = !button.disabled;
    button.setAttribute("data-item-id", item.id);
    button.setAttribute("aria-pressed", response.selectedItemId === item.id ? "true" : "false");
    if (result === true) button.setAttribute("aria-label", item.text + ", correct and locked");
    else if (result === false) button.setAttribute("aria-label", item.text + ", incorrect; select a different category");
    button.addEventListener("click", selectClassificationItem);
    button.addEventListener("keydown", classificationItemKeydown);
    button.addEventListener("dragstart", classificationDragstart);
    return button;
  }

  function classificationItemKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectClassificationItem(event);
  }

  function selectClassificationItem(event) {
    if (event.stopPropagation) event.stopPropagation();
    if (!state || state.status !== "question") return;
    var question = findQuestion(state.currentId);
    var response = classificationResponse(question);
    var itemId = event.currentTarget.getAttribute("data-item-id");
    if (response.evaluated[itemId] === true) return;
    response.selectedItemId = response.selectedItemId === itemId ? null : itemId;
    saveState();
    renderPractice();
  }

  function chooseClassificationCategory(event) {
    if (event.target && event.target !== event.currentTarget && event.target.getAttribute && event.target.getAttribute("data-item-id")) return;
    placeSelectedClassificationItem(event.currentTarget.getAttribute("data-category-id"));
  }

  function classificationCategoryKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    placeSelectedClassificationItem(event.currentTarget.getAttribute("data-category-id"));
  }

  function placeSelectedClassificationItem(categoryId) {
    if (!state || state.status !== "question") return;
    var question = findQuestion(state.currentId);
    var response = classificationResponse(question);
    if (!response.selectedItemId || response.evaluated[response.selectedItemId] === true) return;
    response.placements[response.selectedItemId] = categoryId;
    delete response.evaluated[response.selectedItemId];
    response.selectedItemId = null;
    saveState();
    renderPractice();
  }

  function classificationDragstart(event) {
    if (!event.dataTransfer) return;
    var itemId = event.currentTarget.getAttribute("data-item-id");
    event.dataTransfer.setData("text/plain", itemId);
    event.dataTransfer.effectAllowed = "move";
  }

  function classificationDragover(event) {
    if (!state || state.status !== "question") return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  function classificationDrop(event) {
    event.preventDefault();
    if (!state || state.status !== "question" || !event.dataTransfer) return;
    var question = findQuestion(state.currentId);
    var response = classificationResponse(question);
    var itemId = event.dataTransfer.getData("text/plain");
    if (!findClassificationItem(question, itemId) || response.evaluated[itemId] === true) return;
    response.selectedItemId = itemId;
    placeSelectedClassificationItem(event.currentTarget.getAttribute("data-category-id"));
  }

  function clearClassificationPlacements() {
    if (!state || state.status !== "question") return;
    var question = findQuestion(state.currentId);
    var response = classificationResponse(question);
    question.items.forEach(function (item) {
      if (response.evaluated[item.id] !== true) {
        delete response.placements[item.id];
        delete response.evaluated[item.id];
      }
    });
    response.selectedItemId = null;
    saveState();
    renderPractice();
  }

  function hasMovablePlacement(question, response) {
    return question.items.some(function (item) { return response.placements[item.id] && response.evaluated[item.id] !== true; });
  }

  function classificationStatus(question, response) {
    if (state.status === "feedback") return "Classification complete. Review your first-check score below.";
    var selected = findClassificationItem(question, response.selectedItemId);
    if (selected) return "Selected: " + selected.text + ". Choose a category.";
    var incorrect = question.items.filter(function (item) { return response.evaluated[item.id] === false; }).length;
    if (incorrect) return incorrect + " item" + (incorrect === 1 ? " is" : "s are") + " incorrect. Correct items are locked; move the highlighted item" + (incorrect === 1 ? "" : "s") + " and check again.";
    var placed = question.items.filter(function (item) { return response.placements[item.id]; }).length;
    return placed + " of " + question.items.length + " items placed.";
  }

  function checkClassification() {
    if (!state || state.status !== "question") return;
    checkTimer();
    if (!state || state.status === "results") return;
    var question = findQuestion(state.currentId);
    var response = classificationResponse(question);
    if (question.items.some(function (item) { return !response.placements[item.id]; })) return;
    response.checkCount += 1;
    var evaluated = {};
    var points = 0;
    question.items.forEach(function (item) {
      evaluated[item.id] = response.placements[item.id] === item.correctCategoryId;
      if (evaluated[item.id]) points += 1;
    });
    response.evaluated = evaluated;
    if (response.firstPointsEarned === null) {
      response.firstPointsEarned = points;
      response.firstItemCorrect = clone(evaluated);
    }
    if (points < question.items.length) {
      response.selectedItemId = null;
      saveState();
      renderPractice();
      return;
    }
    recordAttempt(classificationAttempt(question, response, true));
    completeQuestion();
  }

  function classificationAttempt(question, response, completedCorrections) {
    return {
      questionId: question.id,
      type: "classification",
      correct: response.firstPointsEarned === question.items.length,
      firstAttemptCorrect: response.firstPointsEarned === question.items.length,
      attemptCount: response.checkCount,
      pointsEarned: response.firstPointsEarned,
      pointsPossible: question.items.length,
      completedCorrections: completedCorrections,
      placements: clone(response.placements),
      itemResults: question.items.map(function (item) {
        return {
          itemId: item.id,
          categoryId: response.placements[item.id],
          correctCategoryId: item.correctCategoryId,
          firstAttemptCorrect: Boolean(response.firstItemCorrect[item.id])
        };
      }),
      reviewTopic: question.reviewTopic || "General review",
      answeredAt: Date.now()
    };
  }

  function findClassificationItem(question, itemId) {
    return question.items.find(function (item) { return item.id === itemId; }) || null;
  }

  function recordAttempt(attempt) {
    state.attempts.push(attempt);
    if (attempt.correct) {
      state.currentStreak += 1;
      state.longestStreak = Math.max(state.longestStreak, state.currentStreak);
    } else {
      state.currentStreak = 0;
    }
    updateRunningTotals();
  }

  function completeQuestion() {
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
      if (state.status === "question") {
        finishSession(state.deadline);
        return;
      }
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
    recordCheckedClassificationBeforeExit();
    state.endedAt = Math.min(endTime || Date.now(), state.deadline);
    state.status = "results";
    state.timeExpired = state.endedAt >= state.deadline;
    if (!state.code) state.code = makeCode();
    saveState();
    renderResults();
  }

  function recordCheckedClassificationBeforeExit() {
    if (!state || state.status !== "question" || !state.response || state.response.firstPointsEarned === null) return;
    var question = findQuestion(state.currentId);
    if (!question || questionType(question) !== "classification" || state.response.questionId !== question.id) return;
    recordAttempt(classificationAttempt(question, state.response, false));
  }

  function renderResults() {
    stopTimer();
    showOnly("results");
    var attempted = totalPointsPossible();
    var earned = totalPointsEarned();
    var incorrect = attempted - earned;
    var accuracy = percentage(earned, attempted);
    var date = new Date(state.endedAt || Date.now());
    el.resultSessionTitle.textContent = selectedSession.title;
    el.resultName.textContent = [state.firstName, state.lastName].filter(Boolean).join(" ");
    el.resultPeriodWrap.hidden = !state.classPeriod;
    el.resultPeriod.textContent = state.classPeriod;
    el.resultDate.textContent = date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    el.resultTime.textContent = formatElapsed(elapsedSeconds());
    el.resultScore.textContent = earned + " / " + attempted;
    el.resultAttempted.textContent = String(attempted);
    el.resultCorrect.textContent = String(earned);
    el.resultIncorrect.textContent = String(incorrect);
    el.resultStreak.textContent = String(state.longestStreak);
    el.resultAccuracy.textContent = accuracy + "%";
    el.sessionCode.textContent = state.code;
    el.submissionInstruction.textContent = appConfig.submissionInstruction || selectedSession.submissionInstruction;
    el.submitResults.href = buildResultsUrl();
    renderSkillResults();
    el.resultsHeading.focus();
  }

  function renderSkillResults() {
    var skills = Object.create(null);
    state.attempts.forEach(function (attempt) {
      var name = attempt.reviewTopic || "General review";
      if (!skills[name]) skills[name] = { possible: 0, earned: 0 };
      skills[name].possible += attempt.pointsPossible;
      skills[name].earned += attempt.pointsEarned;
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
      var value = document.createElement("strong"); value.textContent = stats.earned + " of " + stats.possible;
      row.appendChild(label); row.appendChild(value); el.skillResults.appendChild(row);
      if (percentage(stats.earned, stats.possible) < 80) needsReview.push(name + ".");
    });
    if (names.length && !needsReview.length) needsReview.push("Continue building speed and confidence with this session.");
    needsReview.forEach(function (text) { var item = document.createElement("li"); item.textContent = text; el.reviewList.appendChild(item); });
  }

  function percentage(correct, attempted) { return attempted ? Math.round(correct / attempted * 100) : 0; }
  function totalPointsEarned() { return state.attempts.reduce(function (total, attempt) { return total + (Number(attempt.pointsEarned) || 0); }, 0); }
  function totalPointsPossible() { return state.attempts.reduce(function (total, attempt) { return total + (Number(attempt.pointsPossible) || 0); }, 0); }
  function updateRunningTotals() {
    state.correct = totalPointsEarned();
    state.incorrect = totalPointsPossible() - state.correct;
  }
  function elapsedSeconds() { var end = state.endedAt || Math.min(Date.now(), state.deadline); return Math.max(0, Math.min(state.durationSeconds, Math.round((end - state.startTime) / 1000))); }
  function formatElapsed(seconds) { var minutes = Math.floor(seconds / 60); var remainder = seconds % 60; return minutes ? minutes + " min " + remainder + " sec" : remainder + " second" + (remainder === 1 ? "" : "s"); }

  function buildResultsUrl() {
    var attempted = totalPointsPossible();
    var earned = totalPointsEarned();
    var values = {
      lastName: state.lastName || "",
      firstName: state.firstName || "",
      classPeriod: formatClassPeriod(state.classPeriod),
      session: selectedSession.title,
      attempted: attempted,
      correct: earned,
      incorrect: attempted - earned,
      accuracy: percentage(earned, attempted) + "%",
      time: formatElapsed(elapsedSeconds()),
      streak: state.longestStreak,
      code: state.code
    };
    var url = new URL(resultsForm.url);
    url.searchParams.set("usp", "pp_url");
    Object.keys(resultsForm.fields).forEach(function (key) {
      url.searchParams.set(resultsForm.fields[key], String(values[key]));
    });
    return url.href;
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

  function findSession(id) { return library.sessions.find(function (session) { return session.id === id; }) || null; }
  function findQuestion(id) { return selectedSession.questions.find(function (question) { return question.id === id; }) || null; }
  function storageKey(sessionId) { return "englishPracticeLabSession:" + sessionId; }
  function saveState() { try { window.sessionStorage.setItem(storageKey(selectedSession.id), JSON.stringify(state)); } catch (error) {} }
  function loadState(sessionId) { try { return JSON.parse(window.sessionStorage.getItem(storageKey(sessionId))); } catch (error) { return null; } }
  function clearState(sessionId) { try { window.sessionStorage.removeItem(storageKey(sessionId)); } catch (error) {} }

  function repairState() {
    state.queue = Array.isArray(state.queue) ? state.queue : [];
    state.attempts = Array.isArray(state.attempts) ? state.attempts : [];
    state.attempts.forEach(function (attempt) {
      if (!Number.isFinite(Number(attempt.pointsPossible)) || Number(attempt.pointsPossible) < 1) attempt.pointsPossible = 1;
      if (!Number.isFinite(Number(attempt.pointsEarned))) attempt.pointsEarned = attempt.correct ? 1 : 0;
      if (!attempt.type) attempt.type = "multiple-choice";
      if (!Number.isFinite(Number(attempt.attemptCount)) || Number(attempt.attemptCount) < 1) attempt.attemptCount = 1;
      if (typeof attempt.firstAttemptCorrect !== "boolean") attempt.firstAttemptCorrect = Boolean(attempt.correct);
    });
    if (!state.firstName && state.studentName) state.firstName = state.studentName;
    state.firstName = String(state.firstName || "");
    state.lastName = String(state.lastName || "");
    updateRunningTotals();
    state.currentStreak = Number(state.currentStreak) || 0;
    state.longestStreak = Number(state.longestStreak) || 0;
    if (!state.durationSeconds) state.durationSeconds = selectedSession.durationMinutes * 60;
    if (!state.currentId && state.status !== "results") chooseNextQuestion();
    if (state.status === "results" && !state.code) { state.code = makeCode(); saveState(); }
  }

  function showOnly(name) { Object.keys(screens).forEach(function (key) { screens[key].hidden = key !== name; }); }
  function showError(message, heading) {
    stopTimer();
    showOnly("error");
    el.errorHeading.textContent = heading || "Practice activity unavailable";
    document.getElementById("error-message").textContent = message;
  }
}());
