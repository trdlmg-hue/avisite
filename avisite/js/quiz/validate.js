/* ==========================================================================
   Avisite Quiz - JSON validation
   Global namespace: window.AvisiteQuiz
   ========================================================================== */

(function (global) {
  "use strict";

  var MAX_QUESTIONS = 500;
  var MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
  var DIFFICULTIES = ["easy", "medium", "hard"];

  /**
   * Quiz JSON ko check karta hai.
   * Return: { ok: boolean, errors: string[], quiz: object|null }
   */
  function validateQuiz(data) {
    var errors = [];

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, errors: ["JSON ek object hona chahiye (curly braces { } ke andar)."], quiz: null };
    }

    if (typeof data.quizTitle !== "string" || data.quizTitle.trim() === "") {
      errors.push("'quizTitle' text hona chahiye aur khali nahi hona chahiye.");
    }

    if (data.timeLimitMinutes !== undefined) {
      if (typeof data.timeLimitMinutes !== "number" || data.timeLimitMinutes <= 0) {
        errors.push("'timeLimitMinutes' ek positive number hona chahiye (jaise 10).");
      }
    }

    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      errors.push("'questions' ek array hona chahiye jisme kam se kam 1 question ho.");
      return { ok: false, errors: errors, quiz: null };
    }

    if (data.questions.length > MAX_QUESTIONS) {
      errors.push("Maximum " + MAX_QUESTIONS + " questions allowed hain.");
    }

    data.questions.forEach(function (q, index) {
      var n = index + 1;

      if (!q || typeof q !== "object") {
        errors.push("Question " + n + ": object nahi hai.");
        return;
      }

      if (typeof q.question !== "string" || q.question.trim() === "") {
        errors.push("Question " + n + ": 'question' text khali hai ya missing hai.");
      }

      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push("Question " + n + ": 'options' me exactly 4 items hone chahiye.");
      } else {
        var emptyOption = q.options.some(function (opt) {
          return typeof opt !== "string" || opt.trim() === "";
        });
        if (emptyOption) {
          errors.push("Question " + n + ": koi option khali ya text nahi hai.");
        }
      }

      if (
        typeof q.answerIndex !== "number" ||
        q.answerIndex % 1 !== 0 ||
        q.answerIndex < 0 ||
        q.answerIndex > 3
      ) {
        errors.push("Question " + n + ": 'answerIndex' 0 se 3 ke beech integer hona chahiye.");
      }

      if (q.explanation !== undefined && typeof q.explanation !== "string") {
        errors.push("Question " + n + ": 'explanation' text hona chahiye.");
      }

      if (q.topic !== undefined && typeof q.topic !== "string") {
        errors.push("Question " + n + ": 'topic' text hona chahiye.");
      }

      if (q.difficulty !== undefined && DIFFICULTIES.indexOf(String(q.difficulty).toLowerCase()) === -1) {
        errors.push("Question " + n + ": 'difficulty' sirf easy, medium ya hard ho sakta hai.");
      }
    });

    return {
      ok: errors.length === 0,
      errors: errors,
      quiz: errors.length === 0 ? normalize(data) : null
    };
  }

  /** Optional fields ko default values deta hai. */
  function normalize(data) {
    return {
      quizTitle: data.quizTitle.trim(),
      timeLimitMinutes: data.timeLimitMinutes || null,
      questions: data.questions.map(function (q, index) {
        return {
          id: q.id !== undefined ? q.id : index + 1,
          question: q.question.trim(),
          options: q.options.map(function (o) { return o.trim(); }),
          answerIndex: q.answerIndex,
          explanation: q.explanation ? q.explanation.trim() : "",
          topic: q.topic && q.topic.trim() ? q.topic.trim() : "General",
          difficulty: q.difficulty ? String(q.difficulty).toLowerCase() : "medium"
        };
      })
    };
  }

  /**
   * File ko read karke validate karta hai.
   * callback(result) call hota hai.
   */
  function validateFile(file, callback) {
    if (!file) {
      callback({ ok: false, errors: ["Koi file select nahi hui."], quiz: null });
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      callback({ ok: false, errors: ["File 2 MB se badi hai. Chhoti JSON file use karein."], quiz: null });
      return;
    }

    var isJson = file.type === "application/json" || /\.json$/i.test(file.name);
    if (!isJson) {
      callback({ ok: false, errors: ["Sirf .json file upload karein."], quiz: null });
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        callback({
          ok: false,
          errors: ["JSON sahi format mein nahi hai. ChatGPT ya Claude ne extra text ya ``` code fences add kiye ho sakte hain. Sirf JSON copy karein."],
          quiz: null
        });
        return;
      }
      callback(validateQuiz(parsed));
    };
    reader.onerror = function () {
      callback({ ok: false, errors: ["File read karne mein error aaya. Dobara try karein."], quiz: null });
    };
    reader.readAsText(file);
  }

  global.AvisiteQuiz = {
    validateQuiz: validateQuiz,
    validateFile: validateFile
  };
})(window);
