import scribe from './scribe-ui/scribe.js/scribe.js';
import { ScribeViewer } from './scribe-ui/viewer.js';

import { elem } from './js/elems.js';
import { Button, Collapse, Tooltip } from './lib/bootstrap.esm.bundle.min.js';
import { ProgressBars } from './js/progressBars.js';
import { insertAlertMessage } from './js/warningMessages.js';

ScribeViewer.enableCanvasSelection = true;
ScribeViewer.KonvaIText.enableEditing = true;
ScribeViewer.init(elem.canvas.canvasContainer, document.documentElement.clientWidth, document.documentElement.clientHeight);

scribe.opt.usePDFText.native.main = true;
scribe.opt.usePDFText.native.supp = true;
scribe.opt.usePDFText.ocr.main = true;
scribe.opt.usePDFText.ocr.supp = true;

/**
 *
 * @param {ProgressMessage} message
 */
const progressHandler = (message) => {
  if (message.type === 'convert') {
    ProgressBars.active.increment();

    const n = message.n;
    const engineName = message.info.engineName;
    // Display the page if either (1) this is the currently active OCR or (2) this is Tesseract Legacy and Tesseract LSTM is active, but does not exist yet.
    // The latter condition occurs briefly whenever recognition is run in "Quality" mode.
    const oemActive = Object.keys(scribe.data.ocr).find((key) => scribe.data.ocr[key] === scribe.data.ocr.active && key !== 'active');
    const displayOCR = engineName === oemActive || ['Tesseract Legacy', 'Tesseract LSTM'].includes(engineName) && oemActive === 'Tesseract Latest';

    if (displayOCR && ScribeViewer.state.cp.n === n) ScribeViewer.displayPage(n);
  } else if (message.type === 'export') {
    ProgressBars.active.increment();
  } else if (message.type === 'importImage') {
    ProgressBars.active.increment();
    if (ScribeViewer.state.cp.n === message.n) {
      ScribeViewer.displayPage(message.n);
    } else if (Math.abs(ScribeViewer.state.cp.n - message.n) < 2) {
      ScribeViewer.renderWords(message.n);
    }
  } else if (message.type === 'importPDF') {
    ProgressBars.active.increment();
    if (ScribeViewer.state.cp.n === message.n) ScribeViewer.displayPage(message.n);
  } else if (message.type === 'render') {
    if (ProgressBars.active === ProgressBars.download) ProgressBars.active.increment();
  }
};

// Exposing important modules for debugging and testing purposes.
// These should not be relied upon in code--import/export should be used instead.
globalThis.df = {
  scribe,
  ScribeCanvas: ScribeViewer,
};

scribe.opt.progressHandler = progressHandler;

scribe.opt.saveDebugImages = true;

scribe.opt.calcSuppFontInfo = true;

scribe.init({ font: true });

// Disable mouse wheel + control to zoom by the browser.
// The application supports zooming in on the canvas,
// however when the browser zooms it results in a blurry canvas,
// as the canvas is not drawn at the appropriate resolution.
window.addEventListener('wheel', (event) => {
  if (event.ctrlKey) {
    event.preventDefault();
  }
}, { passive: false });

scribe.opt.warningHandler = (x) => insertAlertMessage(x, false);
scribe.opt.errorHandler = insertAlertMessage;

// Opt-in to bootstrap tooltip feature
// https://getbootstrap.com/docs/5.0/components/tooltips/
const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
tooltipTriggerList.forEach((tooltipTriggerEl) => new Tooltip(tooltipTriggerEl));

elem.upload.openFileInput.addEventListener('change', () => {
  if (!elem.upload.openFileInput.files || elem.upload.openFileInput.files.length === 0) return;

  importFilesGUI(elem.upload.openFileInput.files);
  // This should run after importFiles so if that function fails the dropzone is not removed
  /** @type {HTMLElement} */ (elem.upload.uploadDropZone.parentElement).style.display = 'none';
});

let highlightActiveCt = 0;
elem.upload.uploadDropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  elem.upload.uploadDropZone.classList.add('highlight');
  highlightActiveCt++;
});

elem.upload.uploadDropZone.addEventListener('dragleave', (event) => {
  event.preventDefault();
  // Only remove the highlight after 0.1 seconds, and only if it has not since been re-activated.
  // This avoids flickering.
  const highlightActiveCtNow = highlightActiveCt;
  setTimeout(() => {
    if (highlightActiveCtNow === highlightActiveCt) {
      elem.upload.uploadDropZone.classList.remove('highlight');
    }
  }, 100);
});

// This is where the drop is handled.
elem.upload.uploadDropZone.addEventListener('drop', async (event) => {
  // Prevent navigation.
  event.preventDefault();

  if (!event.dataTransfer) return;
  const items = await ScribeViewer.getAllFileEntries(event.dataTransfer.items);

  const filesPromises = await Promise.allSettled(items.map((x) => new Promise((resolve, reject) => {
    if (x instanceof File) {
      resolve(x);
    } else {
      x.file(resolve, reject);
    }
  })));
  const files = filesPromises.map((x) => x.value);

  if (files.length === 0) return;

  elem.upload.uploadDropZone.classList.remove('highlight');

  importFilesGUI(files);

  // This should run after importFiles so if that function fails the dropzone is not removed
  /** @type {HTMLElement} */ (elem.upload.uploadDropZone.parentElement).style.display = 'none';
});

/**
 * Handle paste event to retrieve image from clipboard.
 * @param {ClipboardEvent} event - The paste event containing clipboard data.
 */
const handlePaste = async (event) => {
  // The event listner is on the `window` so is not deleted when the dropzone is hidden.
  if (scribe.data.pageMetrics.length > 0) return;
  const clipboardData = event.clipboardData;
  if (!clipboardData) return;
  const items = clipboardData.items;

  const imageArr = [];
  for (const item of items) {
    if (item.type.indexOf('image') === 0) {
      const blob = item.getAsFile();
      imageArr.push(blob);
    }
  }

  if (imageArr.length > 0) {
    await importFilesGUI(imageArr);
    elem.upload.uploadDropZone.setAttribute('style', 'display:none');
  }
};

// The paste listner needs to be on the window, not the dropzone.
// Paste events are only triggered for individual elements if they are either input elements or have contenteditable set to true, neither of which are the case here.
window.addEventListener('paste', handlePaste);

/**
 * Fetches an array of URLs and runs `importFiles` on the results.
 * Intended only to be used by automated testing and not by users.
 *
 * @param {Array<string>} urls
 */
globalThis.fetchAndImportFiles = async (urls) => {
  // Call the existing importFiles function with the file array
  importFilesGUI(urls);

  elem.upload.uploadDropZone.setAttribute('style', 'display:none');
};

ScribeViewer.interactionCallback = (event) => {
  // When a shortcut that interacts with canvas elements is triggered,
  // any focused UI element from the nav bar are unfocused.
  // If this does not occur, then the UI will remain focused,
  // and users attempting to interact with the canvas may instead interact with the UI.
  // For example, pressing "enter" while the recognize tab is focused may trigger the "Recognize All" button.
  const activeElem = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  if (activeElem && elem.nav.navBar.contains(activeElem)) activeElem.blur();
};

ScribeViewer.destroyControlsCallback = (deselect) => {
  if (deselect) {
    const open = elem.edit.collapseRangeBaselineBS._element.classList.contains('show');

    if (open) {
      elem.edit.collapseRangeBaselineBS.toggle();
      return;
    }
  }
};

/**
 * Maps from generic `KeyboardEvent` when user presses a key to the appropriate action.
 * This function is responsible for all keyboard shortcuts.
 * @param {KeyboardEvent} event - The key down event.
 */
function handleKeyboardEventGUI(event) {
  // When a shortcut that interacts with canvas elements is triggered,
  // any focused UI element from the nav bar are unfocused.
  // If this does not occur, then the UI will remain focused,
  // and users attempting to interact with the canvas may instead interact with the UI.
  // For example, pressing "enter" while the recognize tab is focused may trigger the "Recognize All" button.
  const activeElem = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  if (event.key === 'Escape') {
    // eslint-disable-next-line no-new
    if (elem.nav.editFindCollapse.classList.contains('show')) new Collapse(elem.nav.editFindCollapse, { toggle: true });
  }

  // If the user is typing in an input in the nav bar, do not trigger shortcuts.
  if (activeElem && elem.nav.navBar.contains(activeElem) && (activeElem instanceof HTMLInputElement || activeElem instanceof HTMLSelectElement)) return;

  if (event.ctrlKey && ['f'].includes(event.key)) {
    // eslint-disable-next-line no-new
    if (!elem.nav.editFindCollapse.classList.contains('show')) new Collapse(elem.nav.editFindCollapse, { toggle: true });
    elem.nav.editFind.focus();
    event.preventDefault(); // Prevent the default action to avoid browser zoom
    event.stopPropagation();
    if (activeElem && elem.nav.navBar.contains(activeElem)) activeElem.blur();
    return;
  }
}

// Add various keyboard shortcuts.
document.addEventListener('keydown', handleKeyboardEventGUI);

// Add various event listners to HTML elements
elem.nav.next.addEventListener('click', () => ScribeViewer.displayPage(ScribeViewer.state.cp.n + 1, true, false));
elem.nav.prev.addEventListener('click', () => ScribeViewer.displayPage(ScribeViewer.state.cp.n - 1, true, false));

elem.nav.zoomIn.addEventListener('click', () => {
  ScribeViewer.zoom(1.1, ScribeViewer.getStageCenter());
});

elem.nav.zoomOut.addEventListener('click', () => {
  ScribeViewer.zoom(0.9, ScribeViewer.getStageCenter());
});

elem.edit.styleItalic.addEventListener('click', () => { ScribeViewer.CanvasSelection.modifySelectedWordStyle('italic'); });
elem.edit.styleBold.addEventListener('click', () => { ScribeViewer.CanvasSelection.modifySelectedWordStyle('bold'); });

elem.edit.fontMinus.addEventListener('click', () => { ScribeViewer.CanvasSelection.modifySelectedWordFontSize('minus'); });
elem.edit.fontPlus.addEventListener('click', () => { ScribeViewer.CanvasSelection.modifySelectedWordFontSize('plus'); });
elem.edit.fontSize.addEventListener('change', () => { ScribeViewer.CanvasSelection.modifySelectedWordFontSize(elem.edit.fontSize.value); });
elem.edit.wordFont.addEventListener('change', () => { ScribeViewer.CanvasSelection.modifySelectedWordFontFamily(elem.edit.wordFont.value); });

elem.edit.styleSmallCaps.addEventListener('click', () => ScribeViewer.CanvasSelection.modifySelectedWordSmallCaps(elem.edit.styleSmallCaps.classList.contains('active')));
elem.edit.styleSuper.addEventListener('click', () => ScribeViewer.CanvasSelection.modifySelectedWordSuper(elem.edit.styleSuper.classList.contains('active')));

elem.edit.ligatures.addEventListener('change', () => {
  scribe.opt.ligatures = elem.edit.ligatures.checked;
  ScribeViewer.displayPage(ScribeViewer.state.cp.n);
});

/** @type {Array<import('./scribe-ui/js/viewerWordObjects.js').KonvaOcrWord>} */
let objectsLine;

const baselineRange = 25;
export function adjustBaseline() {
  const open = elem.edit.collapseRangeBaselineBS._element.classList.contains('show');

  if (open) {
    elem.edit.collapseRangeBaselineBS.toggle();
    return;
  }

  const selectedObjects = ScribeViewer.CanvasSelection.getKonvaWords();
  if (!selectedObjects || selectedObjects.length === 0) {
    return;
  }

  // Only open if a word is selected.
  elem.edit.collapseRangeBaselineBS.toggle();

  elem.edit.rangeBaseline.value = String(baselineRange + selectedObjects[0].baselineAdj);

  // Unlikely identify lines using the ID of the first word on the line.
  const lineI = selectedObjects[0]?.word?.line?.words[0]?.id;

  console.assert(lineI !== undefined, 'Failed to identify line for word.');

  objectsLine = ScribeViewer.getKonvaWords().filter((x) => x.word.line.words[0].id === lineI);
}

/**
 * Visually moves the selected line's baseline on the canvas.
 * Called when user is actively dragging the adjust baseline slider.
 *
 * @param {string | number} value - New baseline value.
 */
export function adjustBaselineRange(value) {
  const valueNum = typeof value === 'string' ? parseInt(value) : value;

  // The `topBaseline` is modified for all words, even though position is only changed for non-superscripted words.
  // This allows the properties to be accurate if the user ever switches the word to non-superscripted.
  objectsLine.forEach((objectI) => {
    objectI.topBaseline = objectI.topBaselineOrig + (valueNum - baselineRange);
    if (!objectI.word.sup) {
      objectI.yActual = objectI.topBaseline;
    }
  });

  ScribeViewer.layerText.batchDraw();
}

/**
 * Adjusts the selected line's baseline in the canvas object and underlying OCR data.
 * Called after user releases adjust baseline slider.
 *
 * @param {string | number} value - New baseline value.
 */
export function adjustBaselineRangeChange(value) {
  const valueNum = typeof value === 'string' ? parseInt(value) : value;

  const valueNew = valueNum - baselineRange;
  const valueChange = valueNew - objectsLine[0].baselineAdj;

  for (let i = 0; i < objectsLine.length; i++) {
    const wordI = objectsLine[i];

    wordI.baselineAdj = valueNew;

    // Adjust baseline offset for line
    if (i === 0) {
      wordI.word.line.baseline[1] += valueChange;
    }
  }
}

export function toggleEditButtons(disable = true) {
  elem.edit.wordFont.disabled = disable;
  elem.edit.fontMinus.disabled = disable;
  elem.edit.fontPlus.disabled = disable;
  elem.edit.fontSize.disabled = disable;

  elem.edit.styleItalic.disabled = disable;
  elem.edit.styleBold.disabled = disable;
  elem.edit.styleSmallCaps.disabled = disable;
  elem.edit.styleSuper.disabled = disable;

  elem.edit.deleteWord.disabled = disable;
  elem.edit.recognizeWord.disabled = disable;
  elem.edit.recognizeWordDropdown.disabled = disable;
  elem.edit.editBaseline.disabled = disable;
}

elem.edit.editBaseline.addEventListener('click', adjustBaseline);

elem.edit.rangeBaseline.addEventListener('input', () => { adjustBaselineRange(elem.edit.rangeBaseline.value); });
elem.edit.rangeBaseline.addEventListener('mouseup', () => { adjustBaselineRangeChange(elem.edit.rangeBaseline.value); });

elem.edit.deleteWord.addEventListener('click', ScribeViewer.CanvasSelection.deleteSelectedWord);

elem.edit.addWord.addEventListener('click', () => (ScribeViewer.mode = 'addWord'));

elem.edit.smartQuotes.addEventListener('click', () => {
  ScribeViewer.KonvaIText.smartQuotes = elem.edit.smartQuotes.checked;
});

elem.download.download.addEventListener('click', handleDownloadGUI);
elem.download.pdfPagesLabel.addEventListener('click', updatePdfPagesLabel);

export async function recognizeAllClick() {
  const oemMode = 'combined';

  ProgressBars.active = ProgressBars.import;
  const progressMax = oemMode === 'combined' ? scribe.data.image.pageCount * 2 + 1 : scribe.data.image.pageCount + 1;
  ProgressBars.active.show(progressMax, 0);

  await scribe.recognize({
    modeAdv: oemMode,
    langs: ScribeViewer.opt.langs,
    combineMode: ScribeViewer.opt.combineMode,
    vanillaMode: ScribeViewer.opt.vanillaMode,
  });

  ScribeViewer.displayPage(ScribeViewer.state.cp.n);

  ProgressBars.active.increment();

  toggleEditButtons(false);
  toggleLayoutButtons(false);
}

elem.edit.recognizeArea.addEventListener('click', () => (ScribeViewer.mode = 'recognizeArea'));
elem.edit.recognizeWord.addEventListener('click', () => (ScribeViewer.mode = 'recognizeWord'));

function toggleSelectableWords(selectable = true) {
  const allObjects = ScribeViewer.getKonvaWords();
  allObjects.forEach((obj) => {
    obj.listening(selectable);
  });
}

function setDefaultLayoutClick() {
  ScribeViewer.layout.setDefaultLayout(ScribeViewer.state.cp.n);
  ScribeViewer.layout.setDefaultLayoutDataTable(ScribeViewer.state.cp.n);
}

function revertLayoutClick() {
  scribe.data.layoutRegions.pages[ScribeViewer.state.cp.n].default = true;
  scribe.data.layoutRegions.pages[ScribeViewer.state.cp.n].boxes = structuredClone(scribe.data.layoutRegions.defaultRegions);
  scribe.data.layoutDataTables.pages[ScribeViewer.state.cp.n].default = true;
  scribe.data.layoutDataTables.pages[ScribeViewer.state.cp.n].tables = structuredClone(scribe.data.layoutDataTables.defaultTables);

  ScribeViewer.displayPage(ScribeViewer.state.cp.n);
}

elem.layout.addDataTable.addEventListener('click', () => (ScribeViewer.mode = 'addLayoutBoxDataTable'));

elem.layout.setDefaultLayout.addEventListener('click', () => setDefaultLayoutClick());

elem.layout.revertLayout.addEventListener('click', () => revertLayoutClick());

elem.layout.setLayoutBoxInclusionRuleMajority.addEventListener('click', () => ScribeViewer.layout.setLayoutBoxInclusionRuleClick('majority'));
elem.layout.setLayoutBoxInclusionRuleLeft.addEventListener('click', () => ScribeViewer.layout.setLayoutBoxInclusionRuleClick('left'));

elem.layout.setLayoutBoxInclusionLevelWord.addEventListener('click', () => ScribeViewer.layout.setLayoutBoxInclusionLevelClick('word'));
elem.layout.setLayoutBoxInclusionLevelLine.addEventListener('click', () => ScribeViewer.layout.setLayoutBoxInclusionLevelClick('line'));

elem.download.pdfPageMin.addEventListener('keyup', (event) => {
  if (event.keyCode === 13) {
    updatePdfPagesLabel();
  }
});

elem.download.pdfPageMax.addEventListener('keyup', (event) => {
  if (event.keyCode === 13) {
    updatePdfPagesLabel();
  }
});

elem.nav.pageNum.addEventListener('keyup', (event) => {
  if (event.keyCode === 13) {
    ScribeViewer.displayPage(parseInt(elem.nav.pageNum.value) - 1, true);
  }
});

elem.download.xlsxFilenameColumn.addEventListener('click', () => {
  scribe.opt.xlsxFilenameColumn = elem.download.xlsxFilenameColumn.checked;
});

elem.download.xlsxPageNumberColumn.addEventListener('click', () => {
  scribe.opt.xlsxPageNumberColumn = elem.download.xlsxPageNumberColumn.checked;
});

// TODO: Make one of these swtiches impact the other, so that they can be tied to a single option in `opt`.

elem.nav.prevMatch.addEventListener('click', () => prevMatchClick());
elem.nav.nextMatch.addEventListener('click', () => nextMatchClick());

export function toggleLayoutButtons(disable = true) {
  elem.layout.addDataTable.disabled = disable;
  elem.layout.setDefaultLayout.disabled = disable;
  elem.layout.revertLayout.disabled = disable;
}

ProgressBars.active = ProgressBars.import;

const importFilesGUI = async (files) => {
  ProgressBars.active = ProgressBars.import;
  ProgressBars.active.show(files.length, 0);

  const hocrMode = files.some((x) => x.name.match(/\.hocr$/i));

  await scribe.importFiles(files);

  ScribeViewer.displayPage(ScribeViewer.state.cp.n);

  // Add fonts extracted from document to the UI
  if (scribe.inputData.pdfMode && scribe.data.font.doc && Object.keys(scribe.data.font.doc).length > 0) {
    Object.keys(scribe.data.font.doc).forEach((label) => {
      const option = document.createElement('option');
      option.value = label;
      option.text = label;
      elem.edit.wordFont.appendChild(option);
    });
  }

  if (!hocrMode && (scribe.inputData.imageMode || scribe.inputData.pdfMode && scribe.inputData.pdfType === 'image')) {
    const noTextDialogElem = /** @type {HTMLDivElement} */ (document.getElementById('noTextDialog'));
    const noTextDialogRecognizeButtonElem = /** @type {HTMLLinkElement} */ (document.getElementById('noTextDialogRecognizeButton'));
    const importProgressCollapseLabelElem = /** @type {HTMLDivElement} */ (document.getElementById('importProgressCollapseLabel'));
    noTextDialogElem.style.display = '';
    noTextDialogRecognizeButtonElem.addEventListener('click', () => {
      scribe.data.ocr.active = [];
      importProgressCollapseLabelElem.textContent = 'Recognizing Text';
      recognizeAllClick();
      noTextDialogElem.style.display = 'none';
    });
  }
  if (!hocrMode && scribe.inputData.pdfMode && scribe.inputData.pdfType === 'ocr') {
    const ocrTextDialogElem = /** @type {HTMLDivElement} */ (document.getElementById('ocrTextDialog'));
    const ocrTextDialogUseExistingButtonElem = /** @type {HTMLLinkElement} */ (document.getElementById('ocrTextDialogUseExistingButton'));
    const ocrTextDialogRecognizeButtonElem = /** @type {HTMLLinkElement} */ (document.getElementById('ocrTextDialogRecognizeButton'));
    const importProgressCollapseLabelElem = /** @type {HTMLDivElement} */ (document.getElementById('importProgressCollapseLabel'));
    ocrTextDialogElem.style.display = '';
    ocrTextDialogRecognizeButtonElem.addEventListener('click', () => {
      scribe.data.ocr.active = [];
      importProgressCollapseLabelElem.textContent = 'Recognizing Text';
      recognizeAllClick();
      ocrTextDialogElem.style.display = 'none';
    });
    ocrTextDialogUseExistingButtonElem.addEventListener('click', () => {
      ocrTextDialogElem.style.display = 'none';
    });
  }

  // Start loading Tesseract if it was not already loaded.
  // Tesseract is not loaded on startup, however if the user uploads data, they presumably want to run something that requires Tesseract.
  const ocrParams = { anyOk: true, vanillaMode: ScribeViewer.opt.vanillaMode, langs: ScribeViewer.opt.langs };
  scribe.init({ ocr: true, ocrParams });

  elem.nav.pageNum.value = '1';
  elem.nav.pageCount.textContent = String(scribe.inputData.pageCount);

  scribe.inputData.defaultDownloadFileName = scribe.inputData.defaultDownloadFileName.replace(/\.\w{1,4}$/, '.xlsx');

  // Allow for downloads.
  elem.download.downloadFileName.value = scribe.inputData.defaultDownloadFileName;
  elem.download.download.disabled = false;

  // if (scribe.inputData.imageMode || scribe.inputData.pdfMode) {
  //   // For PDF inputs, enable "Add Text to Import PDF" option
  //   if (scribe.inputData.pdfMode) {
  //     elem.download.addOverlayCheckbox.checked = true;
  //     elem.download.addOverlayCheckbox.disabled = false;
  //   } else {
  //     elem.download.addOverlayCheckbox.checked = false;
  //     elem.download.addOverlayCheckbox.disabled = true;
  //   }
  // }

  if (scribe.inputData.xmlMode[0]) {
    // updateOcrVersionGUI();
    toggleEditButtons(false);
    toggleLayoutButtons(false);
  }

  ProgressBars.active.fill();
};

function prevMatchClick() {
  if (ScribeViewer.state.cp.n === 0) return;
  const lastPage = ScribeViewer.search.matches.slice(0, ScribeViewer.state.cp.n)?.findLastIndex((x) => x > 0);
  if (lastPage > -1) ScribeViewer.displayPage(lastPage, true);
}

function nextMatchClick() {
  const nextPageOffset = ScribeViewer.search.matches.slice(ScribeViewer.state.cp.n + 1)?.findIndex((x) => x > 0);
  if (nextPageOffset > -1) ScribeViewer.displayPage(ScribeViewer.state.cp.n + nextPageOffset + 1, true);
}

elem.nav.editFindCollapse.addEventListener('show.bs.collapse', (e) => {
  if (e.target instanceof HTMLElement && e.target.id === 'editFindCollapse') {
    ScribeViewer.state.searchMode = true;
    ScribeViewer.search.highlightcp(ScribeViewer.search.search);
  }
});

elem.nav.editFindCollapse.addEventListener('hide.bs.collapse', (e) => {
  if (e.target instanceof HTMLElement && e.target.id === 'editFindCollapse') {
    ScribeViewer.state.searchMode = false;
    const words = ScribeViewer.getKonvaWords();
    words.forEach((word) => word.fillBox = false);
    ScribeViewer.layerText.batchDraw();
  }
});

elem.nav.editFind.addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
    const val = elem.nav.editFind.value.trim();
    if (!val) return;

    if (val === ScribeViewer.search.search) {
      if (event.shiftKey) {
        prevMatchClick();
      } else {
        nextMatchClick();
      }
    } else {
      findTextClick(val);
    }
  }
});

function findTextClick(text) {
  ScribeViewer.search.findText(text);
  elem.nav.matchCurrent.textContent = calcMatchNumber(ScribeViewer.state.cp.n);
  elem.nav.matchCount.textContent = String(ScribeViewer.search.total);
}

// Returns string showing index of match(es) found on current page.
function calcMatchNumber(n) {
  const matchN = ScribeViewer.search.matches?.[n];
  if (!matchN) {
    return '-';
  }
  // Sum of matches on all previous pages
  const matchPrev = ScribeViewer.search.matches.slice(0, n).reduce((a, b) => a + b, 0);

  if (matchN === 1) {
    return String(matchPrev + 1);
  }
  return `${String(matchPrev + 1)}-${String(matchPrev + 1 + (matchN - 1))}`;
}

// Users may select an edit action (e.g. "Add Word", "Recognize Word", etc.) but then never follow through.
// This function cleans up any changes/event listners caused by the initial click in such cases.
elem.nav.navBar.addEventListener('click', (e) => {
  ScribeViewer.mode = 'select';
}, true);

elem.download.download.addEventListener('hidden.bs.collapse', (e) => {
  if (e.target instanceof HTMLElement && e.target.id === 'nav-download') {
    ProgressBars.download.hide();
  }
});

elem.nav.navLayout.addEventListener('show.bs.collapse', (e) => {
  if (e.target instanceof HTMLElement && e.target.id === 'nav-layout') {
    ScribeViewer.state.layoutMode = true;
    // Generally we handle drawing manually, however `autoDrawEnabled` is needed for the user to drag layout boxes.
    ScribeViewer.Konva.autoDrawEnabled = true;
    if (!scribe.data.layoutRegions.pages[ScribeViewer.state.cp.n]) return;

    // Auto-rotate is always enabled for layout mode, so re-render the page if it is not already rotated.
    if (!scribe.opt.autoRotate) {
      ScribeViewer.displayPage(ScribeViewer.state.cp.n);
    } else {
      toggleSelectableWords(false);
      ScribeViewer.destroyControls();
      ScribeViewer.layout.renderLayoutBoxes(ScribeViewer.state.cp.n);
    }
  }
});

elem.nav.navLayout.addEventListener('hide.bs.collapse', (e) => {
  if (e.target instanceof HTMLElement && e.target.id === 'nav-layout') {
    ScribeViewer.state.layoutMode = false;
    ScribeViewer.Konva.autoDrawEnabled = false;

    ScribeViewer.destroyOverlay(false);
    ScribeViewer.layerOverlay.batchDraw();
    ScribeViewer.setWordColorOpacity();
    ScribeViewer.layerText.batchDraw();
    toggleSelectableWords(true);
  }
});

// Resets the environment.
async function clearFiles() {
  scribe.clear();
  clearUI();
}

async function clearUI() {
  ScribeViewer.state.cp.n = 0;

  if (ScribeViewer.stage) ScribeViewer.stage.clear();
  elem.nav.pageCount.textContent = '';
  elem.nav.pageNum.value = '';
  elem.download.downloadFileName.value = '';
  //   elem.view.optimizeFont.checked = false;
  //   elem.view.optimizeFont.disabled = true;
  elem.download.download.disabled = true;
  // elem.download.addOverlayCheckbox.disabled = true;
  //   toggleEditConfUI(true);
  //   toggleRecognizeUI(true);

  //   elem.evaluate.uploadOCRButton.disabled = true;
  toggleLayoutButtons(true);
  toggleEditButtons(true);
}

clearFiles();

const styleItalicButton = new Button(elem.edit.styleItalic);
const styleBoldButton = new Button(elem.edit.styleBold);
const styleSmallCapsButton = new Button(elem.edit.styleSmallCaps);
const styleSuperButton = new Button(elem.edit.styleSuper);

ScribeViewer.KonvaOcrWord.updateUI = () => {
  const wordFirst = ScribeViewer.CanvasSelection.getKonvaWords()[0];

  if (!wordFirst) return;

  const { fontFamilyArr, fontSizeArr } = ScribeViewer.CanvasSelection.getWordProperties();

  if (fontFamilyArr.length === 1) {
    elem.edit.wordFont.value = String(wordFirst.fontFamilyLookup);
  } else {
    elem.edit.wordFont.value = '';
  }

  if (fontSizeArr.length === 1) {
    elem.edit.fontSize.value = String(wordFirst.fontSize);
  } else {
    elem.edit.fontSize.value = '';
  }

  if (wordFirst.word.sup !== elem.edit.styleSuper.classList.contains('active')) {
    styleSuperButton.toggle();
  }
  if (wordFirst.word.smallCaps !== elem.edit.styleSmallCaps.classList.contains('active')) {
    styleSmallCapsButton.toggle();
  }
  const italic = wordFirst.word.style === 'italic';
  if (italic !== elem.edit.styleItalic.classList.contains('active')) {
    styleItalicButton.toggle();
  }
  const bold = wordFirst.word.style === 'bold';
  if (bold !== elem.edit.styleBold.classList.contains('active')) {
    styleBoldButton.toggle();
  }
};

ScribeViewer.KonvaLayout.updateUI = () => {
  const { inclusionRuleArr, inclusionLevelArr } = ScribeViewer.CanvasSelection.getLayoutBoxProperties();

  if (inclusionRuleArr.length < 1 || inclusionLevelArr.length < 1) return;

  elem.layout.setLayoutBoxInclusionRuleMajority.checked = inclusionRuleArr[0] === 'majority';
  elem.layout.setLayoutBoxInclusionRuleLeft.checked = inclusionRuleArr[0] === 'left';

  elem.layout.setLayoutBoxInclusionLevelWord.checked = inclusionLevelArr[0] === 'word';
  elem.layout.setLayoutBoxInclusionLevelLine.checked = inclusionLevelArr[0] === 'line';
};

ScribeViewer.displayPageCallback = () => {
  elem.nav.pageNum.value = (ScribeViewer.state.cp.n + 1).toString();

  elem.nav.matchCurrent.textContent = calcMatchNumber(ScribeViewer.state.cp.n);
  elem.nav.matchCount.textContent = String(ScribeViewer.search.total);
};

function updatePdfPagesLabel() {
  const pageCount = scribe.inputData.pageCount;

  let minValue = parseInt(elem.download.pdfPageMin.value);
  let maxValue = parseInt(elem.download.pdfPageMax.value);

  // Correct various invalid user inputs.
  if (!minValue || minValue < 1 || minValue > pageCount) minValue = 1;
  if (!maxValue || maxValue < 1 || maxValue > pageCount) maxValue = pageCount;
  if (minValue > maxValue) minValue = maxValue;

  let pagesStr;
  if (minValue > 1 || maxValue < pageCount) {
    pagesStr = ` Pages: ${minValue}–${maxValue}`;
  } else {
    pagesStr = ' Pages: All';
    minValue = 1;
    maxValue = pageCount;
  }

  elem.download.pdfPageMin.value = minValue ? minValue.toString() : '1';
  elem.download.pdfPageMax.value = maxValue ? maxValue.toString() : '';
  elem.download.pdfPagesLabelText.innerText = pagesStr;
}

function setFormatLabel(x) {
  if (x.toLowerCase() === 'hocr') {
    // elem.download.textOptions.setAttribute('style', 'display:none');
    // elem.download.pdfOptions.setAttribute('style', 'display:none');
    // elem.download.docxOptions.setAttribute('style', 'display:none');
    elem.download.xlsxOptions.setAttribute('style', 'display:none');

    elem.download.formatLabelSVG.innerHTML = String.raw`  <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2v-1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5L14 4.5ZM3.527 11.85h-.893l-.823 1.439h-.036L.943 11.85H.012l1.227 1.983L0 15.85h.861l.853-1.415h.035l.85 1.415h.908l-1.254-1.992 1.274-2.007Zm.954 3.999v-2.66h.038l.952 2.159h.516l.946-2.16h.038v2.661h.715V11.85h-.8l-1.14 2.596h-.025L4.58 11.85h-.806v3.999h.706Zm4.71-.674h1.696v.674H8.4V11.85h.791v3.325Z"/>`;

    elem.download.formatLabelText.innerHTML = 'HOCR';
    elem.download.downloadFileName.value = `${elem.download.downloadFileName.value.replace(/\.\w{1,4}$/, '')}.hocr`;
  } else if (x.toLowerCase() === 'xlsx') {
    // elem.download.textOptions.setAttribute('style', 'display:none');
    // elem.download.pdfOptions.setAttribute('style', 'display:none');
    // elem.download.docxOptions.setAttribute('style', 'display:none');
    elem.download.xlsxOptions.setAttribute('style', '');

    elem.download.formatLabelSVG.innerHTML = String.raw`  <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5v2zM3 12v-2h2v2H3zm0 1h2v2H4a1 1 0 0 1-1-1v-1zm3 2v-2h3v2H6zm4 0v-2h3v1a1 1 0 0 1-1 1h-2zm3-3h-3v-2h3v2zm-7 0v-2h3v2H6z"/>`;

    elem.download.formatLabelText.innerHTML = 'Xlsx';
    elem.download.downloadFileName.value = `${elem.download.downloadFileName.value.replace(/\.\w{1,4}$/, '')}.xlsx`;
  }
}

elem.download.formatLabelOptionHOCR.addEventListener('click', () => { setFormatLabel('hocr'); });
elem.download.formatLabelOptionXlsx.addEventListener('click', () => { setFormatLabel('xlsx'); });

async function handleDownloadGUI() {
  elem.download.download.removeEventListener('click', handleDownloadGUI);
  elem.download.download.disabled = true;

  // If recognition is currently running, wait for it to finish.
  await ScribeViewer.state.recognizeAllPromise;

  updatePdfPagesLabel();

  const downloadType = /** @type {("pdf" | "hocr" | "docx" | "xlsx" | "txt" | "text")} */ (/** @type {string} */ (elem.download.formatLabelText.textContent).toLowerCase());

  const fileName = `${elem.download.downloadFileName.value.replace(/\.\w{1,4}$/, '')}.pdf`;

  const minValue = parseInt(elem.download.pdfPageMin.value) - 1;
  const maxValue = parseInt(elem.download.pdfPageMax.value) - 1;

  ProgressBars.active = ProgressBars.download;
  const progressMax = downloadType === 'pdf' ? (maxValue - minValue + 1) * 3 + 1 : (maxValue - minValue + 1) + 1;
  ProgressBars.active.show(progressMax, 0);

  await scribe.download(downloadType, fileName, minValue, maxValue);

  ProgressBars.active.fill();

  elem.download.download.disabled = false;
  elem.download.download.addEventListener('click', handleDownloadGUI);
}
