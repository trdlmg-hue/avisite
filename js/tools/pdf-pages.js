/* ==========================================================================
   PDF Pages - rotate, extract ya delete. Browser mein pdf-lib se chalta hai.
   File kahin upload nahi hoti.
   ========================================================================== */
(function () {
  "use strict";

  var MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

  function $(id) { return document.getElementById(id); }

  var input = $("pp-file");
  var dropZone = $("pp-drop");
  var dropText = $("pp-drop-text");
  var errorBox = $("pp-error");
  var controls = $("pp-controls");
  var infoBox = $("pp-info");
  var actionSelect = $("pp-action");
  var rangeWrap = $("pp-range-wrap");
  var rangeInput = $("pp-range");
  var angleWrap = $("pp-angle-wrap");
  var angleSelect = $("pp-angle");
  var nameInput = $("pp-name");
  var runBtn = $("pp-run");
  var statusBox = $("pp-status");
  var resultBox = $("pp-result");
  var resultInfo = $("pp-result-info");
  var downloadLink = $("pp-download");

  if (!input || !runBtn) { return; }

  var fileBytes = null;
  var totalPages = 0;
  var outputUrl = null;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) { return bytes + " B"; }
    if (bytes < 1024 * 1024) { return (bytes / 1024).toFixed(1) + " KB"; }
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function resetResult() {
    resultBox.hidden = true;
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }
  }

  function safeName(name) {
    return (name || "pages").replace(/[\\/:*?"<>|]+/g, "_").trim() || "pages";
  }

  function updateFields() {
    var action = actionSelect.value;
    rangeWrap.hidden = false;
    angleWrap.hidden = action !== "rotate";
    // Extract mein range zaroori hai, rotate mein khali chhod sakte hain (sab pages)
    var label = document.querySelector('label[for="pp-range"]');
    if (label) {
      label.textContent = action === "rotate"
        ? "Pages to rotate (khali chhodein to sab pages)"
        : (action === "extract" ? "Pages to keep (jaise 1-3, 5)" : "Pages to delete (jaise 2, 4-6)");
    }
  }

  /* ---------- Page range parser ---------- */
  // "1-3, 5" -> [0,1,2,4]  (0-based index)
  function parseRange(text) {
    var set = {};
    var parts = text.split(",");

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) { continue; }

      var a;
      var b;
      var range = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        a = parseInt(range[1], 10);
        b = parseInt(range[2], 10);
      } else if (/^\d+$/.test(part)) {
        a = b = parseInt(part, 10);
      } else {
        return { error: "Galat format: '" + part + "'. Example likhein: 1-3, 5" };
      }

      if (a < 1 || b > totalPages || a > b) {
        return { error: "Page " + part + " sahi nahi hai. Is PDF mein " + totalPages + " pages hain." };
      }

      for (var k = a; k <= b; k++) { set[k - 1] = true; }
    }

    var list = Object.keys(set).map(Number).sort(function (x, y) { return x - y; });
    return { indices: list };
  }

  /* ---------- File selection ---------- */

  function handleFile(file) {
    resetResult();
    showError("");
    fileBytes = null;
    totalPages = 0;
    controls.hidden = true;
    runBtn.disabled = true;

    if (!file) { return; }

    if (!(file.type === "application/pdf" || /\.pdf$/i.test(file.name))) {
      showError("Sirf PDF file upload karein.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError("File 50 MB se badi hai. Chhoti PDF chuniye.");
      return;
    }
    if (!window.PDFLib) {
      showError("PDF library load nahi hui. Internet check karke page refresh karein.");
      return;
    }

    dropText.innerHTML = "";
    var strong = document.createElement("strong");
    strong.textContent = file.name;
    dropText.appendChild(strong);
    dropText.appendChild(document.createTextNode(" (" + formatBytes(file.size) + "). Tap to change."));

    statusBox.textContent = "Reading PDF...";

    file.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      return PDFLib.PDFDocument.load(bytes.slice(0)).then(function (doc) {
        fileBytes = bytes;
        totalPages = doc.getPageCount();
        statusBox.textContent = "";
        infoBox.textContent = "This PDF has " + totalPages + " page(s).";
        controls.hidden = false;
        runBtn.disabled = false;
        updateFields();
      });
    }).catch(function () {
      statusBox.textContent = "";
      showError("Ye PDF padhi nahi ja saki. Shayad password-protected hai ya kharab hai.");
    });
  }

  /* ---------- Run ---------- */

  function run() {
    if (!fileBytes) { return; }

    resetResult();
    showError("");

    var action = actionSelect.value;
    var rangeText = rangeInput.value.trim();
    var indices = null;

    // Pehle input check karo
    if (action === "rotate") {
      if (rangeText) {
        var r1 = parseRange(rangeText);
        if (r1.error) { showError(r1.error); return; }
        indices = r1.indices;
      }
    } else {
      var r2 = parseRange(rangeText);
      if (r2.error) { showError(r2.error); return; }
      if (!r2.indices.length) { showError("Pages likhein, jaise 1-3, 5"); return; }
      indices = r2.indices;
      if (action === "delete" && indices.length >= totalPages) {
        showError("Saare pages delete nahi ho sakte. Kuch pages chhod dein.");
        return;
      }
    }

    runBtn.disabled = true;
    statusBox.textContent = "Working...";

    var job;
    if (action === "rotate") {
      job = rotatePages(indices, Number(angleSelect.value));
    } else if (action === "extract") {
      job = copySelected(indices);
    } else {
      var keep = [];
      for (var i = 0; i < totalPages; i++) {
        if (indices.indexOf(i) === -1) { keep.push(i); }
      }
      job = copySelected(keep);
    }

    job.then(function (bytes) {
      var blob = new Blob([bytes], { type: "application/pdf" });
      outputUrl = URL.createObjectURL(blob);
      downloadLink.href = outputUrl;
      downloadLink.download = safeName(nameInput.value) + "-" + action + ".pdf";

      var label = action === "rotate" ? "Rotated" : (action === "extract" ? "Extracted" : "Deleted");
      resultInfo.textContent = label + ". New PDF: " + formatBytes(blob.size) + ".";
      resultBox.hidden = false;
      resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function () {
      showError("Kuch galat hua. PDF password-protected ho sakti hai, ya dobara try karein.");
    }).then(function () {
      statusBox.textContent = "";
      runBtn.disabled = false;
    });
  }

  function rotatePages(indices, degrees) {
    return PDFLib.PDFDocument.load(fileBytes.slice(0)).then(function (doc) {
      var targets = indices || doc.getPageIndices();
      targets.forEach(function (i) {
        var page = doc.getPage(i);
        var current = page.getRotation().angle;
        page.setRotation(PDFLib.degrees((current + degrees) % 360));
      });
      return doc.save();
    });
  }

  function copySelected(indices) {
    return PDFLib.PDFDocument.load(fileBytes.slice(0)).then(function (src) {
      return PDFLib.PDFDocument.create().then(function (out) {
        return out.copyPages(src, indices).then(function (pages) {
          pages.forEach(function (p) { out.addPage(p); });
          return out.save();
        });
      });
    });
  }

  /* ---------- Events ---------- */

  input.addEventListener("change", function () {
    handleFile(input.files[0]);
    input.value = "";
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
      handleFile(e.dataTransfer.files[0]);
    }
  });

  actionSelect.addEventListener("change", updateFields);
  runBtn.addEventListener("click", run);

  updateFields();
})();
