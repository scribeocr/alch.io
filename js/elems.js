// This file uses static class properties rather than objects for type inference purposes.
// There does not appear to be any way to enable `noImplicitAny` for a single object in TypeScript, so this achieves the same effect.
// If an object is used with `noImplicitAny` disabled, using elements that do not exist will not throw an error.
// If `noImplicitAny` is enabled, an enormous number of errors will be thrown elsewhere in the codebase.

import { Collapse } from '../lib/bootstrap.esm.bundle.min.js';

class upload {
  static uploadOCRName = /** @type {HTMLInputElement} */(document.getElementById('uploadOCRName'));

  static uploadOCRFile = /** @type {HTMLInputElement} */(document.getElementById('uploadOCRFile'));

  static uploadDropZone = /** @type {HTMLInputElement} */(document.getElementById('uploadDropZone'));

  static openFileInput = /** @type {HTMLInputElement} */(document.getElementById('openFileInput'));
}

class nav {
  static next = /** @type {HTMLInputElement} */(document.getElementById('next'));

  static prev = /** @type {HTMLInputElement} */(document.getElementById('prev'));

  static pageNum = /** @type {HTMLInputElement} */(document.getElementById('pageNum'));

  static pageCount = /** @type {HTMLInputElement} */(document.getElementById('pageCount'));

  static zoomIn = /** @type {HTMLInputElement} */(document.getElementById('zoomIn'));

  static zoomOut = /** @type {HTMLInputElement} */(document.getElementById('zoomOut'));

  static editFind = /** @type {HTMLInputElement} */(document.getElementById('editFind'));

  static editFindCollapse = /** @type {HTMLDivElement} */(document.getElementById('editFindCollapse'));

  static matchCount = /** @type {HTMLInputElement} */(document.getElementById('matchCount'));

  static matchCurrent = /** @type {HTMLInputElement} */(document.getElementById('matchCurrent'));

  static prevMatch = /** @type {HTMLInputElement} */(document.getElementById('prevMatch'));

  static nextMatch = /** @type {HTMLInputElement} */(document.getElementById('nextMatch'));

  static navBar = /** @type {HTMLDivElement} */(document.getElementById('navBar'));

  // static navRecognize = /** @type {HTMLDivElement} */(document.getElementById('nav-recognize'));

  static navLayout = /** @type {HTMLDivElement} */(document.getElementById('nav-layout'));
}

// There is no view tab in the UI, but the options in the View tab in scribeocr.com are included here for consistency.
class view {
  static outlineLines = /** @type {HTMLInputElement} */(document.getElementById('outlineLines'));

  static outlineWords = /** @type {HTMLInputElement} */(document.getElementById('outlineWords'));

  static outlinePars = /** @type {HTMLInputElement} */(document.getElementById('outlinePars'));
}

class edit {
  // Font size and style.
  static wordFont = /** @type {HTMLInputElement} */(document.getElementById('wordFont'));

  static fontMinus = /** @type {HTMLInputElement} */(document.getElementById('fontMinus'));

  static fontPlus = /** @type {HTMLInputElement} */(document.getElementById('fontPlus'));

  static fontSize = /** @type {HTMLInputElement} */(document.getElementById('fontSize'));

  static styleItalic = /** @type {HTMLInputElement} */(document.getElementById('styleItalic'));

  static styleBold = /** @type {HTMLInputElement} */(document.getElementById('styleBold'));

  static styleSmallCaps = /** @type {HTMLInputElement} */(document.getElementById('styleSmallCaps'));

  static styleSuper = /** @type {HTMLInputElement} */(document.getElementById('styleSuper'));

  // Add/remove words
  static addWord = /** @type {HTMLInputElement} */(document.getElementById('addWord'));

  static deleteWord = /** @type {HTMLInputElement} */(document.getElementById('deleteWord'));

  static recognizeWord = /** @type {HTMLInputElement} */(document.getElementById('recognizeWord'));

  static recognizeArea = /** @type {HTMLInputElement} */(document.getElementById('recognizeArea'));

  static recognizeWordDropdown = /** @type {HTMLInputElement} */(document.getElementById('recognizeWordDropdown'));

  // Misc
  static editBaseline = /** @type {HTMLInputElement} */(document.getElementById('editBaseline'));

  static rangeBaseline = /** @type {HTMLInputElement} */(document.getElementById('rangeBaseline'));

  static collapseRangeBaseline = /** @type {HTMLDivElement} */(document.getElementById('collapseRangeBaseline'));

  static collapseRangeBaselineBS = new Collapse(edit.collapseRangeBaseline, { toggle: false });

  static smartQuotes = /** @type {HTMLInputElement} */(document.getElementById('smartQuotes'));

  static ligatures = /** @type {HTMLInputElement} */(document.getElementById('ligatures'));

  static kerning = /** @type {HTMLInputElement} */(document.getElementById('kerning'));
}

class layout {
  static setLayoutBoxInclusionRuleMajority = /** @type {HTMLInputElement} */(document.getElementById('setLayoutBoxInclusionRuleMajority'));

  static setLayoutBoxInclusionRuleLeft = /** @type {HTMLInputElement} */(document.getElementById('setLayoutBoxInclusionRuleLeft'));

  static setLayoutBoxInclusionLevelWord = /** @type {HTMLInputElement} */(document.getElementById('setLayoutBoxInclusionLevelWord'));

  static setLayoutBoxInclusionLevelLine = /** @type {HTMLInputElement} */(document.getElementById('setLayoutBoxInclusionLevelLine'));

  static layoutBoxType = /** @type {HTMLElement} */ (document.getElementById('layoutBoxType'));

  static addDataTable = /** @type {HTMLInputElement} */(document.getElementById('addDataTable'));

  static deleteLayout = /** @type {HTMLInputElement} */(document.getElementById('deleteLayout'));

  static layoutApplyPagesMin = /** @type {HTMLInputElement} */(document.getElementById('layoutApplyPagesMin'));

  static layoutApplyPagesMax = /** @type {HTMLInputElement} */(document.getElementById('layoutApplyPagesMax'));

  static layoutApplyPages = /** @type {HTMLButtonElement} */(document.getElementById('layoutApplyPages'));

}

class download {
  static download = /** @type {HTMLInputElement} */(document.getElementById('download'));

  static downloadFileName = /** @type {HTMLInputElement} */(document.getElementById('downloadFileName'));

  static pdfPagesLabel = /** @type {HTMLElement} */(document.getElementById('pdfPagesLabel'));

  static pdfPagesLabelText = /** @type {HTMLElement} */(document.getElementById('pdfPagesLabelText'));

  static xlsxFilenameColumn = /** @type {HTMLInputElement} */(document.getElementById('xlsxFilenameColumn'));

  static xlsxPageNumberColumn = /** @type {HTMLInputElement} */(document.getElementById('xlsxPageNumberColumn'));

  static pdfPageMin = /** @type {HTMLInputElement} */(document.getElementById('pdfPageMin'));

  static pdfPageMax = /** @type {HTMLInputElement} */(document.getElementById('pdfPageMax'));

  // Format labels/options
  static formatLabelSVG = /** @type {HTMLElement} */(document.getElementById('formatLabelSVG'));

  static formatLabelText = /** @type {HTMLElement} */(document.getElementById('formatLabelText'));

  static xlsxOptions = /** @type {HTMLElement} */(document.getElementById('xlsxOptions'));

  // static formatLabelOptionPDF = /** @type {HTMLLinkElement} */(document.getElementById('formatLabelOptionPDF'));

  static formatLabelOptionHOCR = /** @type {HTMLLinkElement} */(document.getElementById('formatLabelOptionHOCR'));

  // static formatLabelOptionText = /** @type {HTMLLinkElement} */(document.getElementById('formatLabelOptionText'));

  // static formatLabelOptionDocx = /** @type {HTMLLinkElement} */(document.getElementById('formatLabelOptionDocx'));

  static formatLabelOptionXlsx = /** @type {HTMLLinkElement} */(document.getElementById('formatLabelOptionXlsx'));
}

class info {

  // Debug output.
  static downloadDebugCsv = /** @type {HTMLDivElement} */(document.getElementById('downloadDebugCsv'));

  static downloadSourcePDF = /** @type {HTMLDivElement} */(document.getElementById('downloadSourcePDF'));

  static downloadStaticVis = /** @type {HTMLDivElement} */(document.getElementById('downloadStaticVis'));

  static downloadPDFFonts = /** @type {HTMLDivElement} */(document.getElementById('downloadPDFFonts'));

  static debugPrintCoords = /** @type {HTMLInputElement} */(document.getElementById('debugPrintCoords'));

  static debugDownloadCanvas = /** @type {HTMLInputElement} */(document.getElementById('debugDownloadCanvas'));

  static debugDownloadImage = /** @type {HTMLInputElement} */(document.getElementById('debugDownloadImage'));

  static debugPrintWordsCanvas = /** @type {HTMLInputElement} */(document.getElementById('debugPrintWordsCanvas'));

  static debugPrintWordsOCR = /** @type {HTMLInputElement} */(document.getElementById('debugPrintWordsOCR'));

  static debugEvalLine = /** @type {HTMLInputElement} */(document.getElementById('debugEvalLine'));

}


class canvas {
  static legendCanvasParentDiv = /** @type {HTMLDivElement} */(document.getElementById('legendCanvasParentDiv'));

  static legendCanvas = /** @type {HTMLCanvasElement} */(document.getElementById('legendCanvas'));

  static debugCanvasParentDiv = /** @type {HTMLDivElement} */(document.getElementById('debugCanvasParentDiv'));

  static canvasContainer = /** @type {HTMLDivElement} */(document.getElementById('c'));
}

export class elem {
  static upload = upload;

  static canvas = canvas;

  static nav = nav;

  static view = view;

  static edit = edit;

  static layout = layout;

  static download = download;

  static info = info;
}
