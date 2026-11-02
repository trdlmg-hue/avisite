/* ==========================================================================
   Quiz start page: question bank banana, topics chunna, test ke liye
   questions select karna, aur session set karke play page kholna.
   ========================================================================== */
(function () {
  "use strict";

  var BANK_KEY = "avisiteQuizBank";       // saved question bank (localStorage)
  var SESSION_KEY = "avisiteQuizSession"; // test settings (sessionStorage)
  var DEFAULT_COUNT = 20;
  var DEFAULT_TOPIC = "General";

  // Har question ke liye time (minutes mein) difficulty ke hisaab se
  var MINUTES_BY_DIFFICULTY = { easy: 0.5, medium: 1, hard: 2 };

  function $(id) { return document.getElementById(id); }

  function readStore(store, key) {
    try { var raw = store.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }

  function writeStore(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function questionKey(text) {
    return String(text).trim().toLowerCase().replace(/\s+/g, " ");
  }

  // Question ka ID text se khud banta hai (AI ka diya id use nahi hota).
  // Same question = same ID, isliye duplicate apne aap pehchaan jaata hai.
  function makeId(text) {
    var str = questionKey(text);
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return "q" + (h >>> 0).toString(36);
  }

  function topicOf(q) {
    return q.topic || DEFAULT_TOPIC;
  }

  /* ---------- Elements ---------- */

  var fileInput = $("quiz-files");
  var dropZone = $("drop-zone");
  var dropText = $("drop-text");
  var bankInfo = $("bank-info");
  var errorBox = $("errors");
  var clearBtn = $("clear-bank");
  var buildCard = $("build-card");
  var topicsBox = $("topics");
  var countInput = $("count");
  var countHelp = $("count-help");
  var minutesInput = $("minutes");
  var modeCard = $("mode-card");
  var optionsCard = $("options-card");
  var negativeOn = $("negative-on");
  var penaltyWrap = $("penalty-wrap");
  var startBtn = $("start-btn");

  if (!fileInput || !startBtn) { return; }

  /* ---------- State ---------- */

  var bank = readStore(localStorage, BANK_KEY) || { questions: [] };
  var selectedTopics = {};     // topic name -> true/false
  var minutesTouched = false;  // user ne minutes khud change kiye ya nahi
  var lastNotes = [];

  function saveBank() {
    writeStore(localStorage, BANK_KEY, bank);
  }

  function showErrors(list) {
    errorBox.innerHTML = "";
    list.forEach(function (msg) {
      var d = document.createElement("div");
      d.textContent = msg;
      errorBox.appendChild(d);
    });
    errorBox.hidden = list.length === 0;
  }

  /* ---------- Bank add (duplicate questions skip) ---------- */

  function addQuizToBank(quiz) {
    var seen = {};
    bank.questions.forEach(function (q) { seen[q.id || makeId(q.question)] = true; });

    var added = 0;
    var skipped = 0;
    quiz.questions.forEach(function (q) {
      var key = makeId(q.question);
      if (seen[key]) { skipped++; return; }
      seen[key] = true;
      bank.questions.push({
        id: key,
        question: q.question,
        options: q.options,
        answerIndex: q.answerIndex,
        explanation: q.explanation,
        topic: topicOf(q),
        difficulty: q.difficulty || "medium",
        source: quiz.quizTitle
      });
      added++;
    });
    return { added: added, skipped: skipped };
  }

  function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (files.length === 0) { return; }

    var errors = [];
    var notes = [];
    var pending = files.length;
    showErrors([]);

    files.forEach(function (file) {
      AvisiteQuiz.validateFile(file, function (result) {
        if (result.ok) {
          var r = addQuizToBank(result.quiz);
          notes.push(file.name + ": " + r.added + " added" +
            (r.skipped ? ", " + r.skipped + " duplicate skipped" : ""));
        } else {
          errors.push(file.name + ": " + result.errors.join(" "));
        }

        pending -= 1;
        if (pending === 0) {
          lastNotes = notes;
          saveBank();
          showErrors(errors);
          refresh();
        }
      });
    });
  }

  /* ---------- Rendering ---------- */

  function topicCounts() {
    var map = {};
    bank.questions.forEach(function (q) {
      var t = topicOf(q);
      map[t] = (map[t] || 0) + 1;
    });
    return map;
  }

  // Recommended time: selected topics ki difficulty ke average se
  function recommendedMinutes(list, count) {
    if (!list.length) { return 1; }
    var sum = 0;
    list.forEach(function (q) {
      sum += MINUTES_BY_DIFFICULTY[q.difficulty || "medium"] || 1;
    });
    var average = sum / list.length;
    return Math.max(1, Math.round(average * count));
  }

  function availableQuestions() {
    return bank.questions.filter(function (q) {
      return selectedTopics[topicOf(q)];
    });
  }

  function renderTopics(counts, topics) {
    topicsBox.innerHTML = "";
    topics.forEach(function (t) {
      var label = document.createElement("label");
      label.className = "topic-item";

      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = !!selectedTopics[t];
      box.addEventListener("change", function () {
        selectedTopics[t] = box.checked;
        updateCount();
      });

      var text = document.createElement("span");
      text.textContent = t + " (" + counts[t] + ")";

      label.appendChild(box);
      label.appendChild(text);
      topicsBox.appendChild(label);
    });
  }

  function updateCount() {
    var available = availableQuestions().length;

    if (available === 0) {
      countHelp.textContent = "Select at least one topic.";
      countInput.value = "";
      startBtn.disabled = true;
      return;
    }

    var value = parseInt(countInput.value, 10);
    if (isNaN(value) || value < 1) { value = Math.min(DEFAULT_COUNT, available); }
    value = Math.min(value, available);
    countInput.max = available;
    countInput.value = value;
    countHelp.textContent = "Available from selected topics: " + available + " questions.";

    var recommended = recommendedMinutes(availableQuestions(), value);
    if ($("minutes-help")) {
      $("minutes-help").textContent = "Recommended: " + recommended + " min for " + value +
        " questions (easy 30 sec, medium 1 min, hard 2 min each). Time khatam hone par test auto-submit hota hai.";
    }
    if (!minutesTouched) {
      minutesInput.value = recommended;
    }
    startBtn.disabled = false;
  }

  function refresh() {
    var total = bank.questions.length;
    var counts = topicCounts();
    var topics = Object.keys(counts).sort();

    if (total === 0) {
      bankInfo.textContent = "No questions saved yet. Upload one or more quiz files to start.";
      clearBtn.hidden = true;
      if ($("download-bank")) { $("download-bank").hidden = true; }
      buildCard.hidden = true;
      modeCard.hidden = true;
      optionsCard.hidden = true;
      startBtn.disabled = true;
      return;
    }

    // Naye topics default selected, purane topics ki choice wahi rahe
    var next = {};
    topics.forEach(function (t) {
      next[t] = (t in selectedTopics) ? selectedTopics[t] : true;
    });
    selectedTopics = next;

    var sources = {};
    bank.questions.forEach(function (q) { sources[q.source] = true; });
    var sourceCount = Object.keys(sources).length;

    bankInfo.textContent = "Question bank: " + total + " questions from " + sourceCount + " file(s).";
    if (lastNotes.length) {
      bankInfo.appendChild(document.createElement("br"));
      bankInfo.appendChild(document.createTextNode(lastNotes.join(" | ")));
    }

    clearBtn.hidden = false;
    if ($("download-bank")) { $("download-bank").hidden = false; }
    buildCard.hidden = false;
    modeCard.hidden = false;
    optionsCard.hidden = false;

    renderTopics(counts, topics);
    updateCount();
  }

  /* ---------- Balanced selection ----------
     Har topic se round-robin mein questions uthaata hai,
     taaki exam mein sab topics ka balance rahe. */
  function pickBalanced(list, count) {
    var groups = {};
    shuffle(list).forEach(function (q) {
      var t = topicOf(q);
      (groups[t] = groups[t] || []).push(q);
    });

    var keys = shuffle(Object.keys(groups));
    var out = [];

    while (out.length < count) {
      var progressed = false;
      for (var k = 0; k < keys.length && out.length < count; k++) {
        var group = groups[keys[k]];
        if (group.length) {
          out.push(group.shift());
          progressed = true;
        }
      }
      if (!progressed) { break; }
    }

    return shuffle(out);
  }

  /* ---------- Events ---------- */

  fileInput.addEventListener("change", function () {
    handleFiles(fileInput.files);
    fileInput.value = ""; // same file dobara chune ja sake
  });

  ["dragenter", "dragover"].forEach(function (evt) {
    dropZone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropZone.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    dropZone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropZone.classList.remove("is-dragover");
    });
  });
  dropZone.addEventListener("drop", function (e) {
    if (e.dataTransfer && e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  });

  var pasteBtn = $("paste-add");
  var pasteBox = $("paste-json");

  if (pasteBtn && pasteBox) {
    pasteBtn.addEventListener("click", function () {
      var text = pasteBox.value.trim()
        .replace(/^```(json)?/i, "")
        .replace(/```$/, "")
        .trim();

      if (!text) {
        showErrors(["Pehle JSON text paste karein."]);
        return;
      }

      var data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        showErrors(["Pasted text sahi JSON nahi hai. Poora text copy kiya hai, { se } tak? Extra text ho to hata dein."]);
        return;
      }

      var result = AvisiteQuiz.validateQuiz(data);
      if (!result.ok) {
        showErrors(result.errors);
        return;
      }

      var r = addQuizToBank(result.quiz);
      lastNotes = ["Pasted JSON: " + r.added + " added" +
        (r.skipped ? ", " + r.skipped + " duplicate skipped" : "")];
      saveBank();
      showErrors([]);
      pasteBox.value = "";
      refresh();
    });
  }

  clearBtn.addEventListener("click", function () {
    if (!window.confirm("Saved question bank delete karna hai? Ye wapas nahi aayega.")) { return; }
    bank = { questions: [] };
    selectedTopics = {};
    lastNotes = [];
    minutesTouched = false;
    saveBank();
    showErrors([]);
    refresh();
  });

  var downloadBtn = $("download-bank");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      var out = {
        quizTitle: "Avisite question bank",
        questions: bank.questions.map(function (q) {
          return {
            id: q.id,
            topic: q.topic,
            difficulty: q.difficulty,
            question: q.question,
            options: q.options,
            answerIndex: q.answerIndex,
            explanation: q.explanation
          };
        })
      };
      var blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "avisite-question-bank.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  countInput.addEventListener("change", updateCount);
  minutesInput.addEventListener("input", function () { minutesTouched = true; });

  if ($("use-recommended")) {
    $("use-recommended").addEventListener("click", function () {
      minutesTouched = false;
      updateCount();
    });
  }

  negativeOn.addEventListener("change", function () {
    penaltyWrap.hidden = !negativeOn.checked;
  });

  startBtn.addEventListener("click", function () {
    var available = availableQuestions();
    if (available.length === 0) { return; }

    var count = Math.min(Math.max(parseInt(countInput.value, 10) || DEFAULT_COUNT, 1), available.length);
    var picked = pickBalanced(available, count);
    var minutes = Math.max(1, parseInt(minutesInput.value, 10) || Math.round(count * 1.5));
    var mode = document.querySelector('input[name="mode"]:checked').value;

    var quiz = {
      quizTitle: "Custom test",
      timeLimitMinutes: minutes,
      questions: picked.map(function (q, i) {
        return {
          id: i + 1,
          question: q.question,
          options: q.options,
          answerIndex: q.answerIndex,
          explanation: q.explanation || "",
          topic: topicOf(q),
          difficulty: q.difficulty || "medium"
        };
      })
    };

    var session = {
      quiz: quiz,
      mode: mode,
      useTimer: $("timer-on").checked,
      shuffle: $("shuffle-on").checked,
      negativeMarking: negativeOn.checked,
      penalty: negativeOn.checked ? parseFloat($("penalty").value) : 0,
      startedAt: new Date().toISOString()
    };

    if (!writeStore(sessionStorage, SESSION_KEY, session)) {
      showErrors(["Test start nahi ho paya. Browser storage band hai, use on karein aur dobara try karein."]);
      return;
    }

    window.location.href = "/quiz/play.html";
  });

  refresh();
})();
