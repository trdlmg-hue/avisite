/* ==========================================================================
   Merge PDF - browser mein chalta hai, pdf-lib se PDFs jodta hai.
   File kahin upload nahi hoti.
   ========================================================================== */
(function () {
  "use strict";

  var MAX_FILES = 30;
  var MAX_TOTAL_BYTES = 150 * 1024 * 1024; // 150 MB

  function $(id) { return document.getElementById(id); }

  var input = $("mp-file");
  var dropZone = $("mp-drop");
  var dropText = $("mp-drop-text");
  var listBox = $("mp-list");
  var errorBox = $("mp-error");
  var controls = $("mp-controls");
  var nameInput = $("mp-name");
  var mergeBtn = $("mp-merge");
  var clearBtn = $("mp-clear");
  var statusBox = $("mp-status");
  var resultBox = $("mp-result");
  var resultInfo = $("mp-info");
  var downloadLink = $("mp-download");

  if (!input || !mergeBtn) { return; }

  var items = [];      // { file, pages, bytes? }
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

  function totalBytes() {
    return items.reduce(function (sum, it) { return sum + it.file.size; }, 0);
  }

  function resetResult() {
    resultBox.hidden = true;
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }
  }

  function isPdf(file) {
    return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  }

  /* ---------- Add files ---------- */

  function readPageCount(file) {
    return file.arrayBuffer().then(function (buf) {
      if (!window.PDFLib) {
        throw new Error("lib");
      }
      return PDFLib.PDFDocument.load(new Uint8Array(buf), { ignoreEncryption: false })
        .then(function (doc) {
          return { pages: doc.getPageCount(), bytes: new Uint8Array(buf) };
        });
    });
  }

  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (files.length === 0) { return; }

    if (!window.PDFLib) {
      showError("PDF library load nahi hui. Internet check karke page refresh karein.");
      return;
    }

    resetResult();
    showError("");
    statusBox.textContent = "Reading PDFs...";

    var problems = [];
    var chain = Promise.resolve();

    files.forEach(function (file) {
      chain = chain.then(function () {
        if (!isPdf(file)) {
          problems.push(file.name + ": sirf PDF file.");
          return;
        }
        if (items.length >= MAX_FILES) {
          problems.push("Maximum " + MAX_FILES + " PDFs allowed hain.");
          return;
        }
        if (totalBytes() + file.size > MAX_TOTAL_BYTES) {
          problems.push(file.name + ": total size 150 MB se zyada ho jaayega.");
          return;
        }
        return readPageCount(file).then(function (info) {
          items.push({ file: file, pages: info.pages, bytes: info.bytes });
        }, function () {
          problems.push(file.name + ": ye PDF padhi nahi ja saki. Shayad password-protected hai ya kharab hai.");
        });
      });
    });

    chain.then(function () {
      statusBox.textContent = "";
      showError(problems.join(" "));
      render();
    });
  }

  /* ---------- List ---------- */

  function removeAt(index) {
    items.splice(index, 1);
    resetResult();
    render();
  }

  function move(index, direction) {
    var target = index + direction;
    if (target < 0 || target >= items.length) { return; }
    var temp = items[index];
    items[index] = items[target];
    items[target] = temp;
    resetResult();
    render();
  }

  function render() {
    listBox.innerHTML = "";

    items.forEach(function (it, i) {
      var li = document.createElement("li");
      li.className = "img-item";

      var badge = document.createElement("div");
      badge.className = "pdf-badge";
      badge.textContent = "PDF";

      var info = document.createElement("div");
      info.className = "img-item__info";
      info.textContent = (i + 1) + ". " + it.file.name + " · " + it.pages + " page(s) · " + formatBytes(it.file.size);

      var actions = document.createElement("div");
      actions.className = "img-item__actions";

      var up = document.createElement("button");
      up.type = "button";
      up.className = "btn btn--outline img-item__btn";
      up.textContent = "Up";
      up.setAttribute("aria-label", "Move up");
      up.disabled = i === 0;
      up.addEventListener("click", function () { move(i, -1); });

      var down = document.createElement("button");
      down.type = "button";
      down.className = "btn btn--outline img-item__btn";
      down.textContent = "Down";
      down.setAttribute("aria-label", "Move down");
      down.disabled = i === items.length - 1;
      down.addEventListener("click", function () { move(i, 1); });

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn--outline img-item__btn";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove PDF");
      remove.addEventListener("click", function () { removeAt(i); });

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(remove);

      li.appendChild(badge);
      li.appendChild(info);
      li.appendChild(actions);
      listBox.appendChild(li);
    });

    var has = items.length > 0;
    controls.hidden = !has;
    mergeBtn.disabled = items.length < 2;
    dropText.textContent = has
      ? items.length + " PDF(s) selected. Tap to add more."
      : "Tap to choose PDFs, or drag them here";

    if (has && items.length < 2) {
      showError(errorBox.textContent || "Merge ke liye kam se kam 2 PDF chahiye.");
    }
  }

  /* ---------- Merge ---------- */

  function safeName(name) {
    return (name || "merged").replace(/[\\/:*?"<>|]+/g, "_").trim() || "merged";
  }

  function mergePdfs() {
    if (items.length < 2) { return; }

    resetResult();
    showError("");
    mergeBtn.disabled = true;
    statusBox.textContent = "Merging...";

    var out;
    var totalPages = 0;

    PDFLib.PDFDocument.create()
      .then(function (created) {
        out = created;
        return items.reduce(function (chain, it, i) {
          return chain.then(function () {
            statusBox.textContent = "Adding PDF " + (i + 1) + " of " + items.length + "...";
            return PDFLib.PDFDocument.load(it.bytes, { ignoreEncryption: false })
              .then(function (src) {
                return out.copyPages(src, src.getPageIndices());
              })
              .then(function (pages) {
                pages.forEach(function (p) { out.addPage(p); });
                totalPages += pages.length;
              });
          });
        }, Promise.resolve());
      })
      .then(function () {
        statusBox.textContent = "Saving PDF...";
        return out.save();
      })
      .then(function (bytes) {
        var blob = new Blob([bytes], { type: "application/pdf" });
        outputUrl = URL.createObjectURL(blob);
        downloadLink.href = outputUrl;
        downloadLink.download = safeName(nameInput.value) + ".pdf";
        resultInfo.textContent = "Merged PDF ready: " + totalPages + " page(s), " + formatBytes(blob.size) + ".";
        resultBox.hidden = false;
        resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch(function () {
        showError("Merge nahi ho paya. Kisi PDF mein problem ho sakti hai. Us PDF ko hata kar dobara try karein.");
      })
      .then(function () {
        statusBox.textContent = "";
        mergeBtn.disabled = items.length < 2;
      });
  }

  /* ---------- Events ---------- */

  input.addEventListener("change", function () {
    addFiles(input.files);
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
      addFiles(e.dataTransfer.files);
    }
  });

  mergeBtn.addEventListener("click", mergePdfs);

  clearBtn.addEventListener("click", function () {
    if (items.length && !window.confirm("Saari PDFs hata dein?")) { return; }
    items = [];
    resetResult();
    showError("");
    render();
  });

  render();
})();
