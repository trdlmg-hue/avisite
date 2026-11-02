/* ==========================================================================
   Image Compressor - browser mein chalta hai, file kahin upload nahi hoti.
   Canvas API se image ko resize aur re-encode karta hai.
   ========================================================================== */
(function () {
  "use strict";

  var MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
  var MIME_BY_FORMAT = { jpeg: "image/jpeg", webp: "image/webp", png: "image/png" };
  var EXT_BY_FORMAT = { jpeg: "jpg", webp: "webp", png: "png" };

  function $(id) { return document.getElementById(id); }

  var fileInput = $("ic-file");
  var dropZone = $("ic-drop");
  var dropText = $("ic-drop-text");
  var errorBox = $("ic-error");
  var controls = $("ic-controls");
  var formatSelect = $("ic-format");
  var qualityInput = $("ic-quality");
  var qualityValue = $("ic-quality-value");
  var qualityWrap = $("ic-quality-wrap");
  var sizeSelect = $("ic-size");
  var compressBtn = $("ic-compress");
  var statusBox = $("ic-status");
  var resultBox = $("ic-result");
  var previewImg = $("ic-preview");
  var originalText = $("ic-original");
  var newText = $("ic-new");
  var savingText = $("ic-saving");
  var noteBox = $("ic-note");
  var downloadLink = $("ic-download");

  if (!fileInput || !compressBtn) { return; }

  var currentFile = null;
  var currentImage = null;   // { img, url }
  var outputUrl = null;      // object URL of result, revoke karna zaroori hai
  var outputName = "";

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

  function loadImage(file, callback) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      callback(null, { img: img, url: url });
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      callback(new Error("decode"));
    };
    img.src = url;
  }

  function handleFile(file) {
    resetResult();
    showError("");
    currentImage = null;
    currentFile = null;
    compressBtn.disabled = true;
    controls.hidden = true;

    if (!file) { return; }

    if (file.type.indexOf("image/") !== 0) {
      showError("Sirf image file (JPG, PNG, WebP) upload karein.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError("File 20 MB se badi hai. Chhoti image chuniye.");
      return;
    }

    dropText.innerHTML = "";
    var strong = document.createElement("strong");
    strong.textContent = file.name;
    dropText.appendChild(strong);
    dropText.appendChild(document.createTextNode(" (" + formatBytes(file.size) + "). Tap to change."));

    statusBox.textContent = "Reading image...";

    loadImage(file, function (err, data) {
      statusBox.textContent = "";
      if (err) {
        showError("Ye image padhi nahi ja saki. JPG, PNG ya WebP try karein. (HEIC iPhone photos kuch browsers mein nahi chalti.)");
        return;
      }
      currentFile = file;
      currentImage = data;
      originalText.textContent = "Original: " + formatBytes(file.size) + " · " +
        data.img.naturalWidth + " × " + data.img.naturalHeight + " px";
      controls.hidden = false;
      compressBtn.disabled = false;
    });
  }

  function updateQualityVisibility() {
    // PNG lossless hai, quality slider wahan kaam nahi karta
    qualityWrap.hidden = formatSelect.value === "png";
  }

  function compress() {
    if (!currentImage || !currentFile) { return; }

    resetResult();
    showError("");
    compressBtn.disabled = true;
    statusBox.textContent = "Compressing...";

    var format = formatSelect.value;
    var quality = Number(qualityInput.value) / 100;
    var maxWidth = Number(sizeSelect.value) || 0;

    var img = currentImage.img;
    var scale = 1;
    if (maxWidth && img.naturalWidth > maxWidth) {
      scale = maxWidth / img.naturalWidth;
    }
    var width = Math.round(img.naturalWidth * scale);
    var height = Math.round(img.naturalHeight * scale);

    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");

    // JPEG mein transparency nahi hoti, isliye white background
    if (format !== "png") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    var mime = MIME_BY_FORMAT[format];
    var q = format === "png" ? undefined : quality;

    canvas.toBlob(function (blob) {
      statusBox.textContent = "";
      compressBtn.disabled = false;

      if (!blob) {
        showError("Compress nahi ho paya. Browser ye format support nahi karta, ya image bahut badi hai. Chhota size ya dusra format try karein.");
        return;
      }

      outputUrl = URL.createObjectURL(blob);
      outputName = baseName(currentFile.name) + "-compressed." + EXT_BY_FORMAT[format];

      previewImg.src = outputUrl;
      previewImg.alt = "Compressed preview of " + currentFile.name;
      newText.textContent = "Compressed: " + formatBytes(blob.size) + " · " + width + " × " + height + " px";

      var saved = 1 - blob.size / currentFile.size;
      if (blob.size < currentFile.size) {
        savingText.textContent = "Saved " + Math.round(saved * 100) + "%";
        savingText.className = "pill pill--correct";
      } else {
        savingText.textContent = "Not smaller than original";
        savingText.className = "pill pill--warn";
        noteBox.textContent = "Is image mein compression se size kam nahi hua. Quality kam karein, width chhoti karein, ya JPEG/WebP chunein.";
        noteBox.hidden = false;
      }

      downloadLink.href = outputUrl;
      downloadLink.download = outputName;
      resultBox.hidden = false;
      resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }, mime, q);
  }

  function baseName(name) {
    return name.replace(/\.[^.]+$/, "") || "image";
  }

  /* ---------- Events ---------- */

  fileInput.addEventListener("change", function () {
    handleFile(fileInput.files[0]);
    fileInput.value = "";
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

  qualityInput.addEventListener("input", function () {
    qualityValue.textContent = qualityInput.value + "%";
  });
  formatSelect.addEventListener("change", updateQualityVisibility);
  compressBtn.addEventListener("click", compress);

  updateQualityVisibility();
  qualityValue.textContent = qualityInput.value + "%";
})();
