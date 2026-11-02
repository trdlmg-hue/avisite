/* ==========================================================================
   Avisite Quiz - Engine (quiz/play.html)
   - Practice mode: har answer par turant feedback
   - Exam mode: score aur review sirf submit ke baad
   - Timer, question palette, mark for review, negative marking
   - Progress localStorage mein (resume), history localStorage mein
   ========================================================================== */

(function () {
  "use strict";

  var SESSION_KEY = "avisiteQuizSession";   // start.html se aata hai (sessionStorage)
  var PROGRESS_KEY = "avisiteQuizProgress"; // unfinished test (localStorage)
  var HISTORY_KEY = "avisiteQuizHistory";   // completed tests (localStorage)
  var MAX_HISTORY = 100;
  var WARN_SECONDS = 300;                   // last 5 minute par warning
  var LABELS = ["A", "B", "C", "D"];

  var PRAISE = [
    "Excellent! That's the correct answer.",
    "Well done! You got it right.",
    "Great job, keep it up!"
  ];
  var ENCOURAGE = [
    "Not this time, but you are learning.",
    "Good try. Read the explanation below and you will get it next time.",
    "Don't worry. Mistakes help you remember. Keep going!"
  ];

  /* ---------- Helpers ---------- */

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function readStore(store, key) {
    try {
      var raw = store.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeStore(store, key, value) {
    try {
      store.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function removeStore(store, key) {
    try { store.removeItem(key); } catch (e) { /* ignore */ }
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function formatTime(seconds) {
    var sec = Math.max(0, Math.floor(seconds));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  // Questions aur options (agar shuffle on ho) ko yahan final order mein banata hai
  function buildItems(session) {
    var items = session.quiz.questions.map(function (q) {
      var order = [0, 1, 2, 3];
      if (session.shuffle) { order = shuffle(order); }
      return {
        question: q.question,
        options: order.map(function (i) { return q.options[i]; }),
        correct: order.indexOf(q.answerIndex),
        explanation: q.explanation || ""
      };
    });
    return session.shuffle ? shuffle(items) : items;
  }

  /* ---------- Load session ---------- */

  var session = readStore(sessionStorage, SESSION_KEY);
  if (!session || !session.quiz || !Array.isArray(session.quiz.questions)) {
    window.location.replace("start.html");
    return;
  }

  var config = {
    title: session.quiz.quizTitle,
    mode: session.mode === "exam" ? "exam" : "practice",
    penalty: session.negativeMarking ? Number(session.penalty) || 0 : 0,
    useTimer: !!session.useTimer && !!session.quiz.timeLimitMinutes,
    totalSeconds: session.quiz.timeLimitMinutes ? session.quiz.timeLimitMinutes * 60 : 0,
    items: null
  };

  var state = null;

  // Unfinished test mila to resume ka option
  var saved = readStore(localStorage, PROGRESS_KEY);
  var resume = saved && !saved.finished && saved.config && saved.config.title === config.title &&
    window.confirm("You have an unfinished test: \"" + config.title + "\". Continue it? (Cancel starts a new test.)");

  if (resume) {
    config = saved.config;
    state = saved.state;
  } else {
    config.items = buildItems(session);
    state = {
      current: 0,
      answers: {},
      marked: {},
      visited: { 0: true },
      elapsed: 0,
      finished: false,
      autoSubmitted: false
    };
  }

  var items = config.items;
  var total = items.length;
  var timerId = null;
  var tickCount = 0;

  /* ---------- Save ---------- */

  function saveProgress() {
    if (state.finished) { return; }
    writeStore(localStorage, PROGRESS_KEY, { config: config, state: state, finished: false });
  }

  /* ---------- Scoring ---------- */

  function computeResult() {
    var correct = 0;
    var wrong = 0;
    var unattempted = 0;

    items.forEach(function (item, i) {
      var a = state.answers[i];
      if (a === undefined) { unattempted++; }
      else if (a === item.correct) { correct++; }
      else { wrong++; }
    });

    var attempted = correct + wrong;
    return {
      correct: correct,
      wrong: wrong,
      unattempted: unattempted,
      score: round2(correct - wrong * config.penalty),
      accuracy: attempted ? Math.round((correct / attempted) * 100) : 0
    };
  }

  /* ---------- Actions ---------- */

  function choose(optionIndex) {
    if (state.finished) { return; }
    // Practice mode mein ek baar jawab dene ke baad badal nahi sakte
    if (config.mode === "practice" && state.answers[state.current] !== undefined) { return; }
    state.answers[state.current] = optionIndex;
    saveProgress();
    render();
  }

  function clearAnswer() {
    if (state.finished || config.mode === "practice") { return; }
    delete state.answers[state.current];
    saveProgress();
    render();
  }

  function toggleMark() {
    if (state.finished) { return; }
    state.marked[state.current] = !state.marked[state.current];
    saveProgress();
    render();
  }

  function goTo(n) {
    if (state.finished) { return; }
    var index = Math.max(0, Math.min(total - 1, n));
    state.current = index;
    state.visited[index] = true;
    saveProgress();
    render();
  }

  function submitTest() {
    if (state.finished) { return; }
    var unanswered = total - Object.keys(state.answers).length;
    var message = unanswered > 0
      ? "You have " + unanswered + " unanswered question(s). Submit the test now?"
      : "Submit the test now?";
    if (window.confirm(message)) {
      finish(false);
    }
  }

  function finish(auto) {
    if (state.finished) { return; }
    state.finished = true;
    state.autoSubmitted = !!auto;
    clearInterval(timerId);

    var result = computeResult();
    var history = readStore(localStorage, HISTORY_KEY) || [];
    history.unshift({
      title: config.title,
      mode: config.mode,
      date: new Date().toISOString(),
      score: result.score,
      total: total,
      correct: result.correct,
      wrong: result.wrong,
      unattempted: result.unattempted,
      accuracy: result.accuracy,
      timeTakenSeconds: state.elapsed,
      negativeMarking: config.penalty > 0,
      penalty: config.penalty,
      autoSubmitted: state.autoSubmitted
    });
    if (history.length > MAX_HISTORY) { history.length = MAX_HISTORY; }
    writeStore(localStorage, HISTORY_KEY, history);

    removeStore(localStorage, PROGRESS_KEY);
    render();
  }

  /* ---------- Timer ---------- */

  function renderTimer() {
    var t = $("timer");
    if (config.useTimer) {
      var remaining = config.totalSeconds - state.elapsed;
      t.textContent = "Time left " + formatTime(remaining);
      t.classList.toggle("is-warning", remaining <= WARN_SECONDS);
    } else {
      t.textContent = "Time " + formatTime(state.elapsed);
      t.classList.remove("is-warning");
    }
  }

  function startTimer() {
    timerId = setInterval(function () {
      if (state.finished) { return; }
      state.elapsed += 1;

      if (config.useTimer && state.elapsed >= config.totalSeconds) {
        finish(true);
        return;
      }

      renderTimer();
      tickCount += 1;
      if (tickCount % 5 === 0) { saveProgress(); }
    }, 1000);
  }

  /* ---------- Render: question view ---------- */

  // Palette ka rang: practice mein sahi green, galat red.
  // Exam mein (submit se pehle) jawab dikhta hai par sahi/galat nahi, isliye neutral violet.
  function paletteStatus(i) {
    var answer = state.answers[i];
    if (answer === undefined) { return "is-unanswered"; }
    if (config.mode === "practice" || state.finished) {
      return answer === items[i].correct ? "is-correct" : "is-wrong";
    }
    return "is-answered";
  }

  function drawPalette(box) {
    box.innerHTML = "";
    items.forEach(function (_, i) {
      var b = el("button", "palette__btn " + paletteStatus(i), String(i + 1));
      b.type = "button";
      b.setAttribute("aria-label", "Question " + (i + 1));
      if (i === state.current && !state.finished) { b.classList.add("is-current"); }
      if (state.marked[i]) { b.classList.add("is-marked"); }
      b.addEventListener("click", function () {
        if (state.finished) {
          var target = document.getElementById("review-" + i);
          if (target) { target.scrollIntoView({ behavior: "smooth", block: "start" }); }
        } else {
          goTo(i);
        }
      });
      box.appendChild(b);
    });
  }

  function renderPalette() {
    drawPalette($("palette"));

    var answeredCount = Object.keys(state.answers).length;
    var summary;
    if (config.mode === "practice") {
      var correct = 0;
      var wrong = 0;
      items.forEach(function (item, i) {
        var a = state.answers[i];
        if (a === undefined) { return; }
        if (a === item.correct) { correct++; } else { wrong++; }
      });
      summary = "Correct " + correct + " · Wrong " + wrong + " · Left " + (total - answeredCount);
    } else {
      summary = answeredCount + " answered, " + (total - answeredCount) + " left";
    }
    $("palette-summary").textContent = summary;
  }

  function renderQuestion() {
    var item = items[state.current];
    var answer = state.answers[state.current];
    var hasAnswer = answer !== undefined;
    var showFeedback = config.mode === "practice" && hasAnswer;

    $("question-count").textContent = "Question " + (state.current + 1) + " of " + total;
    $("question-text").textContent = item.question;

    var list = $("options");
    list.innerHTML = "";
    item.options.forEach(function (text, i) {
      var b = el("button", "option");
      b.type = "button";
      b.appendChild(el("span", "option__label", LABELS[i]));
      b.appendChild(el("span", "option__text", text));

      if (i === answer) { b.classList.add("is-selected"); }
      if (showFeedback) {
        b.disabled = true;
        if (i === item.correct) { b.classList.add("is-correct"); }
        else if (i === answer) { b.classList.add("is-wrong"); }
      }
      if (state.finished) { b.disabled = true; }

      b.addEventListener("click", function () { choose(i); });
      list.appendChild(b);
    });

    var fb = $("feedback");
    fb.innerHTML = "";
    fb.className = "feedback";
    if (showFeedback) {
      var ok = answer === item.correct;
      fb.classList.add(ok ? "feedback--good" : "feedback--bad");
      fb.appendChild(el("strong", "", ok ? pick(PRAISE) : pick(ENCOURAGE)));
      if (!ok) {
        fb.appendChild(el("p", "", "Correct answer: " + LABELS[item.correct] + ". " + item.options[item.correct]));
      }
      if (item.explanation) {
        fb.appendChild(el("p", "feedback__exp", item.explanation));
      }
      fb.hidden = false;
    } else {
      fb.hidden = true;
    }

    $("btn-prev").disabled = state.current === 0;
    $("btn-next").disabled = state.current === total - 1;
    $("btn-mark").textContent = state.marked[state.current] ? "Unmark review" : "Mark for review";
    $("btn-mark").setAttribute("aria-pressed", state.marked[state.current] ? "true" : "false");
    $("btn-clear").disabled = !hasAnswer || config.mode === "practice";
    $("btn-submit").disabled = state.finished;
  }

  /* ---------- Render: result view ---------- */

  function renderHistory() {
    var list = $("history-list");
    list.innerHTML = "";
    var history = (readStore(localStorage, HISTORY_KEY) || []).filter(function (h) {
      return h.title === config.title;
    }).slice(0, 5);

    if (history.length === 0) {
      list.appendChild(el("p", "text-muted", "No earlier attempts yet."));
      return;
    }

    history.forEach(function (h) {
      var row = el("div", "history-row");
      var date = new Date(h.date).toLocaleString();
      row.appendChild(el("span", "", date));
      row.appendChild(el("span", "", (h.mode === "exam" ? "Exam" : "Practice")));
      row.appendChild(el("span", "", "Score " + h.score + " / " + h.total));
      row.appendChild(el("span", "", h.accuracy + "% accuracy"));
      list.appendChild(row);
    });
  }

  function renderResult() {
    $("quiz-view").hidden = true;
    $("result-view").hidden = false;

    var r = computeResult();
    var summary = $("result-summary");
    summary.innerHTML = "";

    [
      ["Score", r.score + " / " + total],
      ["Correct", r.correct],
      ["Wrong", r.wrong],
      ["Unattempted", r.unattempted],
      ["Accuracy", r.accuracy + "%"],
      ["Time taken", formatTime(state.elapsed)]
    ].forEach(function (pair) {
      var card = el("div", "stat");
      card.appendChild(el("div", "stat__value", String(pair[1])));
      card.appendChild(el("div", "stat__label", pair[0]));
      summary.appendChild(card);
    });

    $("time-up-notice").hidden = !state.autoSubmitted;
    $("result-mode").textContent = (config.mode === "exam" ? "Exam mode" : "Practice mode") +
      (config.penalty > 0 ? " · Negative marking -" + config.penalty : "");

    var list = $("review-list");
    list.innerHTML = "";
    items.forEach(function (item, i) {
      var a = state.answers[i];
      var status = a === undefined ? "unanswered" : (a === item.correct ? "correct" : "wrong");
      var label = status === "correct" ? "Correct" : (status === "wrong" ? "Wrong" : "Not answered");

      var wrap = el("article", "review-item review-item--" + status);
      wrap.id = "review-" + i;
      var head = el("h3", "review-item__head");
      head.appendChild(el("span", "pill pill--" + status, label));
      head.appendChild(document.createTextNode(" Q" + (i + 1) + ". " + item.question));
      wrap.appendChild(head);

      wrap.appendChild(el("p", "", "Your answer: " +
        (a === undefined ? "Not answered" : LABELS[a] + ". " + item.options[a])));
      wrap.appendChild(el("p", "", "Correct answer: " + LABELS[item.correct] + ". " + item.options[item.correct]));
      if (item.explanation) {
        wrap.appendChild(el("p", "review-item__exp", item.explanation));
      }
      list.appendChild(wrap);
    });

    drawPalette($("result-palette"));
    renderHistory();
  }

  /* ---------- Main render ---------- */

  function render() {
    if (state.finished) {
      renderResult();
      return;
    }
    renderQuestion();
    renderPalette();
    renderTimer();
  }

  /* ---------- Init ---------- */

  $("quiz-title").textContent = config.title;
  $("mode-badge").textContent = config.mode === "exam" ? "Exam mode" : "Practice mode";

  var negBadge = $("neg-badge");
  negBadge.hidden = config.penalty <= 0;
  negBadge.textContent = "Negative marking -" + config.penalty;

  $("btn-prev").addEventListener("click", function () { goTo(state.current - 1); });
  $("btn-next").addEventListener("click", function () { goTo(state.current + 1); });
  $("btn-mark").addEventListener("click", toggleMark);
  $("btn-clear").addEventListener("click", clearAnswer);
  $("btn-submit").addEventListener("click", submitTest);

  $("btn-retry").addEventListener("click", function () {
    removeStore(localStorage, PROGRESS_KEY);
    window.location.reload();
  });

  // Keyboard: 1-4 se option chuno, arrow keys se navigate karo
  document.addEventListener("keydown", function (event) {
    if (state.finished) { return; }
    if (event.key >= "1" && event.key <= "4") {
      choose(Number(event.key) - 1);
    } else if (event.key === "ArrowRight") {
      goTo(state.current + 1);
    } else if (event.key === "ArrowLeft") {
      goTo(state.current - 1);
    }
  });

  state.visited[state.current] = true;
  saveProgress();
  render();
  if (!state.finished) { startTimer(); }
})();
