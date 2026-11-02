/* ==========================================================================
   Image to PDF - browser mein chalta hai, pdf-lib se PDF banata hai.
   File kahin upload nahi hoti.
   ========================================================================== */
(function () {
  "use strict";

  var MAX_FILES = 50;
  var MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB
  var PAGE_SIZES = {
    a4: [595.28, 841.89],   // points (72 per inch)
    letter: [612, 792]
  };

  function $(id) { return document.getElementById(id); }

  var input = $("itp-file");
  var dropZone = $("itp-drop");
  var dropText = $("itp-drop-text");
  var listBox = $("itp-list");
  var errorBox = $("itp-error");
  var controls = $("itp-controls");
  var pageSizeSelect = $("itp-pagesize");
  var orientSelect = $("itp-orient");
  var marginSelect = $("itp-margin");
  var nameInput = $("itp-name");
  var createBtn = $("itp-create");
  var clearBtn = $("itp-clear");
  var statusBox = $("itp-status");
  var resultBox = $("itp-result");
  var resultInfo = $("itp-info");
  var downloadLink = $("itp-download");

  if (!input || !createBtn) { return; }

  var items = [];      // { file, url }
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

  function isSupported(file) {
    return /^image\/(jpeg|png|webp)$/.test(file.type);
  }

  function resetResult() {
    resultBox.hidden = true;
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
    }
  }

  function revokeItemUrls(list) {
    list.forEach(function (it) {
      if (it.url) { URL.revokeObjectURL(it.url); }
    });
  }

  /* ---------- File list ---------- */

  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (files.length === 0) { return; }

    resetResult();
    var rejected = [];

    files.forEach(function (file) {
      if (!isSupported(file)) {
        rejected.push(file.name + ": sirf JPG, PNG ya WebP.");
        return;
      }
      if (items.length >= MAX_FILES) {
        rejected.push("Maximum " + MAX_FILES + " images allowed hain.");
        return;
      }
      if (totalBytes() + file.size > MAX_TOTAL_BYTES) {
        rejected.push(file.name + ": total size 100 MB se zyada ho jaayega.");
        return;
      }
      items.push({ file: file, url: null });
    });

    showError(rejected.join(" "));
    render();
  }

  function removeAt(index) {
    var removed = items.splice(index, 1);
    revokeItemUrls(removed);
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
      if (!it.url) { it.url = URL.createObjectURL(it.file); }

      var li = document.createElement("li");
      li.className = "img-item";

      var thumb = document.createElement("img");
      thumb.className = "img-item__thumb";
      thumb.alt = "";
      thumb.src = it.url;

      var info = document.createElement("div");
      info.className = "img-item__info";
      info.textContent = (i + 1) + ". " + it.file.name + " (" + formatBytes(it.file.size) + ")";

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
      remove.setAttribute("aria-label", "Remove image");
      remove.addEventListener("click", function () { removeAt(i); });

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(remove);

      li.appendChild(thumb);
      li.appendChild(info);
      li.appendChild(actions);
      listBox.appendChild(li);
    });

    var has = items.length > 0;
    controls.hidden = !has;
    createBtn.disabled = !has;
    dropText.textContent = has
      ? items.length + " image(s) selected. Tap to add more."
      : "Tap to choose images, or drag them here";
    updateOrientation();
  }

  function updateOrientation() {
    // Fit mode mein orientation ka matlab nahi hota
    orientSelect.disabled = pageSizeSelect.value === "fit";
  }

  /* ---------- Image preparation ---------- */

  // pdf-lib sirf JPG aur PNG embed karta hai. WebP ya unsupported JPG ko canvas se PNG banate hain.
  function canvasToPngBytes(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error("canvas")); return; }
          blob.arrayBuffer().then(function (buf) {
            resolve(new Uint8Array(buf));
          }, reject);
        }, "image/png");
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("decode"));
      };
      img.src = url;
    });
  }

  function embedImage(doc, file) {
    return file.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      if (file.type === "image/png") {
        return doc.embedPng(bytes);
      }
      if (file.type === "image/jpeg") {
        return doc.embedJpg(bytes).catch(function () {
          // Progressive JPEG jaise cases ke liye PNG fallback
          return canvasToPngBytes(file).then(function (png) { return doc.embedPng(png); });
        });
      }
      // WebP
      return canvasToPngBytes(file).then(function (png) { return doc.embedPng(png); });
    });
  }

  /* ---------- Create PDF ---------- */

  function safeName(name) {
    return (name || "images").replace(/[\\/:*?"<>|]+/g, "_").trim() || "images";
  }

  function createPdf() {
    if (items.length === 0) { return; }
    if (!window.PDFLib) {
      showError("PDF library load nahi hui. Internet check karke page refresh karein.");
      return;
    }

    resetResult();
    showError("");
    createBtn.disabled = true;
    statusBox.textContent = "Creating PDF...";

    var margin = Number(marginSelect.value) || 0;
    var pageSize = pageSizeSelect.value;
    var orientation = orientSelect.value;
    var doc;

    PDFLib.PDFDocument.create()
      .then(function (created) {
        doc = created;
        return items.reduce(function (chain, it, i) {
          return chain.then(function () {
            statusBox.textContent = "Adding image " + (i + 1) + " of " + items.length + "...";
            return embedImage(doc, it.file).then(function (embedded) {
              addPage(doc, embedded, pageSize, orientation, margin);
            });
          });
        }, Promise.resolve());
      })
      .then(function () {
        statusBox.textContent = "Saving PDF...";
        return doc.save();
      })
      .then(function (bytes) {
        var blob = new Blob([bytes], { type: "application/pdf" });
        outputUrl = URL.createObjectURL(blob);
        downloadLink.href = outputUrl;
        downloadLink.download = safeName(nameInput.value) + ".pdf";
        resultInfo.textContent = "PDF ready: " + items.length + " page(s), " + formatBytes(blob.size) + ".";
        resultBox.hidden = false;
        resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch(function () {
        showError("PDF nahi ban paya. Kisi image mein problem ho sakti hai. Us image ko hata kar dobara try karein.");
      })
      .then(function () {
        statusBox.textContent = "";
        createBtn.disabled = false;
      });
  }

  function addPage(doc, embedded, pageSize, orientation, margin) {
    var pageW;
    var pageH;
    var scale = 1;

    if (pageSize === "fit") {
      // Page image ke size ka hoga
      pageW = embedded.width + 2 * margin;
      pageH = embedded.height + 2 * margin;
    } else {
      var base = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
      var landscape = orientation === "landscape" ||
        (orientation === "auto" && embedded.width > embedded.height);
      pageW = landscape ? base[1] : base[0];
      pageH = landscape ? base[0] : base[1];
      var availW = pageW - 2 * margin;
      var availH = pageH - 2 * margin;
      scale = Math.min(availW / embedded.width, availH / embedded.height);
    }

    var page = doc.addPage([pageW, pageH]);
    var drawW = embedded.width * scale;
    var drawH = embedded.height * scale;

    page.drawImage(embedded, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH
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

  pageSizeSelect.addEventListener("change", updateOrientation);
  createBtn.addEventListener("click", createPdf);

  clearBtn.addEventListener("click", function () {
    if (items.length && !window.confirm("Saari images hata dein?")) { return; }
    revokeItemUrls(items);
    items = [];
    resetResult();
    showError("");
    render();
  });

  render();
})();
