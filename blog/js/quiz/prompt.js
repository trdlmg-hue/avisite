/* ==========================================================================
   Quiz prompt page: page numbers aur question count se prompt banata hai,
   aur copy button chalata hai.
   ========================================================================== */
(function () {
  "use strict";

  var fromInput = document.getElementById("from-page");
  var toInput = document.getElementById("to-page");
  var countInput = document.getElementById("question-count");
  var textarea = document.getElementById("quiz-prompt");
  var button = document.getElementById("copy-prompt");
  var status = document.getElementById("copy-status");
  var errorBox = document.getElementById("page-error");

  if (!fromInput || !textarea || !button) {
    return;
  }

  function buildPrompt(from, to, count) {
    return [
      "Read only pages " + from + " to " + to + " of the attached PDF. Create " + count +
        " multiple-choice questions from them.",
      "",
      "If you can create downloadable files, save the result as a file named quiz-pages-" + from + "-" + to + ".json, give me the download link, and do not paste the JSON in the chat.",
      "If you cannot create files, output ONLY compact valid JSON with no text before or after, no code fences, and no extra spacing.",
      "Format:",
      '{"quizTitle":"Short title","questions":[{"topic":"Chapter or section name","difficulty":"easy","question":"Question text","options":["A","B","C","D"],"answerIndex":0,"explanation":"Short reason"}]}',
      "",
      "Rules:",
      "- Exactly 4 options per question, and only one correct.",
      "- difficulty must be exactly one of: easy, medium, hard. Use a mix.",
      "- answerIndex is the position of the correct option: 0, 1, 2 or 3. Vary the positions.",
      "- Use only information from these pages.",
      '- Use plain double quotes and escape any quotes inside text.'
    ].join("\n");
  }

  // Input se prompt read karke check karta hai
  function currentPrompt() {
    var from = parseInt(fromInput.value, 10);
    var to = parseInt(toInput.value, 10);
    var count = parseInt(countInput.value, 10);
    var problem = "";

    if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
      problem = "From page 1 ya usse bada hona chahiye, aur To page From se bada ya barabar hona chahiye.";
    } else if (isNaN(count) || count < 1 || count > 50) {
      problem = "Questions 1 se 50 ke beech hone chahiye.";
    }

    errorBox.textContent = problem;
    errorBox.hidden = problem === "";
    button.disabled = problem !== "";

    if (problem) {
      textarea.value = "";
      return null;
    }
    var text = buildPrompt(from, to, count);
    textarea.value = text;
    return text;
  }

  function done(message) {
    status.textContent = message;
    setTimeout(function () { status.textContent = ""; }, 2500);
  }

  function fallbackCopy() {
    textarea.select();
    var ok = document.execCommand("copy");
    done(ok ? "Copied!" : "Copy nahi ho paya. Text select karke manually copy karein.");
  }

  [fromInput, toInput, countInput].forEach(function (input) {
    input.addEventListener("input", currentPrompt);
  });

  button.addEventListener("click", function () {
    var text = currentPrompt();
    if (!text) { return; }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        function () { done("Copied!"); },
        fallbackCopy
      );
    } else {
      fallbackCopy();
    }
  });

  currentPrompt();
})();
