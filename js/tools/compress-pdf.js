/* ==========================================================================
   Compress PDF - browser mein chalta hai. Do modes:
   - Keep text (light): PDF ka structure optimize karta hai, text selectable rehta hai.
   - Smaller (images): har page ko image banakar JPEG se compress karta hai.
     Size bahut kam hota hai, par text selectable nahi rehta.
   Libraries: pdf-lib (save) aur pdf.js (render), dono CDN se.
   ========================================================================== */
(function () {
  "use strict";

  var MAX_FILE_BYTES = 80 * 1024 * 1024; // 80 MB
  var PDFJS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  var PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  // Quality preset: render scale (1 = 72 dpi) aur JPEG quality
  var PRESETS = {
    low: { scale: 1.0, jpeg: 0.5 },
    medium: { scale: 1.5, jpeg: 0.7 },
    high: { scale: 2.0, jpeg: 0.85 }
  };

  function $(id) { return document.getElementById(id); }

  var input = $("cp-file");
  var dropZone = $("cp-drop");
  var dropText = $("cp-drop-text");
  var errorBox = $("cp-error");
  var controls = $("cp-controls");
  var modeSelect = $("cp-mode");
  var presetWrap = $("cp-preset-wrap");
  var presetSelect = $("cp-preset");
  var nameInput = $("cp-name");
  var originalInfo = $("cp-original");
  var compressBtn = $("cp-compress");
  var statusBox = $("cp-status");
  var resultBox = $("cp-result");
  var resultInfo = $("cp-info");
  var noteBox = $("cp-note");
  var downloadLink = $("cp-download");

  if (!input || !compressBtn) { return; }

  var currentFile = null;
  var currentBytes = null;
  var currentPages = 0;
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
    noteBox.hidden = true;
    noteBox.textContent = "";
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }
  }

  function safeName(name) {
    return (name || "compressed").replace(/[\\/:*?"<>|]+/g, "_").trim() || "compressed";
  }

  function updatePresetVisibility() {
    presetWrap.hidden = modeSelect.value !== "images";
  }

  /* ---------- pdf.js loader ---------- */

  var pdfjsPromise = null;

  function loadPdfJs() {
    if (window.pdfjsLib) { return Promise.resolve(window.pdfjsLib); }
    if (pdfjsPromise) { return pdfjsPromise; }

    pdfjsPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = PDFJS_SRC;
      script.onload = function () {
        if (!window.pdfjsLib) { reject(new Error("pdfjs")); return; }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      };
      script.onerror = function () { reject(new Error("pdfjs-load")); };
      document.head.appendChild(script);
    });
    return pdfjsPromise;
  }

  /* ---------- File selection ---------- */

  function handleFile(file) {
    resetResult();
    showError("");
    currentFile = null;
    currentBytes = null;
    compressBtn.disabled = true;
    controls.hidden = true;

    if (!file) { return; }

    if (!(file.type === "application/pdf" || /\.pdf$/i.test(file.name))) {
      showError("Sirf PDF file upload karein.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError("File 80 MB se badi hai. Chhoti PDF chuniye.");
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
      if (!window.PDFLib) { throw new Error("lib"); }
      return PDFLib.PDFDocument.load(bytes.slice(0)).then(function (doc) {
        currentFile = file;
        currentBytes = bytes;
        currentPages = doc.getPageCount();
        statusBox.textContent = "";
        originalInfo.textContent = "Original: " + formatBytes(file.size) + " · " + currentPages + " page(s)";
        controls.hidden = false;
        compressBtn.disabled = false;
      });
    }).catch(function () {
      statusBox.textContent = "";
      showError("Ye PDF padhi nahi ja saki. Shayad password-protected hai ya kharab hai. Password hata kar dobara try karein.");
    });
  }

  /* ---------- Mode 1: light (text bacha rahe) ---------- */

  function compressLight() {
    return PDFLib.PDFDocument.load(currentBytes.slice(0)).then(function (doc) {
      doc.setProducer("");
      doc.setCreator("");
      return doc.save({ useObjectStreams: true });
    });
  }

  /* ---------- Mode 2: images (sabse zyada size bachta hai) ---------- */

  function compressImages(preset) {
    return loadPdfJs().then(function (pdfjs) {
      return pdfjs.getDocument({ data: currentBytes.slice(0) }).promise.then(function (pdfDoc) {
        var out;
        var total = pdfDoc.numPages;

        return PDFLib.PDFDocument.create().then(function (created) {
          out = created;

          var chain = Promise.resolve();
          for (let pageNo = 1; pageNo <= total; pageNo++) {
            chain = chain.then(function () {
              statusBox.textContent = "Compressing page " + pageNo + " of " + total + "...";
              return pdfDoc.getPage(pageNo).then(function (page) {
                var base = page.getViewport({ scale: 1 });
                var viewport = page.getViewport({ scale: preset.scale });

                var canvas = document.createElement("canvas");
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                var ctx = canvas.getContext("2d");
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                return page.render({ canvasContext: ctx, viewport: viewport }).promise
                  .then(function () {
                    return new Promise(function (resolve, reject) {
                      canvas.toBlob(function (blob) {
                        if (!blob) { reject(new Error("canvas")); return; }
                        resolve(blob);
                      }, "image/jpeg", preset.jpeg);
                    });
                  })
                  .then(function (blob) { return blob.arrayBuffer(); })
                  .then(function (buf) { return out.embedJpg(new Uint8Array(buf)); })
                  .then(function (img) {
                    var pg = out.addPage([base.width, base.height]);
                    pg.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
                  });
              });
            });
          }
          return chain;
        }).then(function () {
          statusBox.textContent = "Saving PDF...";
          return out.save();
        });
      });
    });
  }

  /* ---------- Run ---------- */

  function compress() {
    if (!currentBytes) { return; }

    resetResult();
    showError("");
    compressBtn.disabled = true;
    statusBox.textContent = "Compressing...";

    var mode = modeSelect.value;
    var preset = PRESETS[presetSelect.value] || PRESETS.medium;

    var job = mode === "images" ? compressImages(preset) : compressLight();

    job.then(function (bytes) {
      var blob = new Blob([bytes], { type: "application/pdf" });
      outputUrl = URL.createObjectURL(blob);
      downloadLink.href = outputUrl;
      downloadLink.download = safeName(nameInput.value) + ".pdf";

      var saved = 1 - blob.size / currentFile.size;
      resultInfo.textContent = "New size: " + formatBytes(blob.size) + " (was " + formatBytes(currentFile.size) + ").";
      if (blob.size < currentFile.size) {
        resultInfo.textContent += " Saved " + Math.round(saved * 100) + "%.";
      } else {
        noteBox.textContent = "Is PDF ka size kam nahi hua. 'Smaller (images)' mode ya Low quality try karein.";
        noteBox.hidden = false;
      }

      resultBox.hidden = false;
      resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function (err) {
      var message = "Compress nahi ho paya. Kuch PDFs is browser mein handle nahi hoti. Dusra mode ya chhoti file try karein.";
      if (err && /password/i.test(String(err.name || err.message))) {
        message = "Ye PDF password-protected hai. Password hata kar dobara try karein.";
      }
      showError(message);
    }).then(function () {
      statusBox.textContent = "";
      compressBtn.disabled = false;
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

  modeSelect.addEventListener("change", updatePresetVisibility);
  compressBtn.addEventListener("click", compress);

  updatePresetVisibility();
})();
