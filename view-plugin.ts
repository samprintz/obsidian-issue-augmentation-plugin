import { EditorView, ViewUpdate, Decoration, DecorationSet, ViewPlugin } from "@codemirror/view";
import { IssueWidget } from 'issue-widget'


const issues = { // TODO replace with issueIdToTitleMap
    "#1646": "Restore butten",
    "#1878": "CSV import",
    "#1880": "Bugfix",
    "#1824": "Refactor status bar"
};


export interface DecorationSpec {
    id: string,
    url: string,
    title: string,
    start: number,
    end: number
}


function getAllDecosByLine(view: EditorView) {
    const widgets:{[lineNumber: number]: DecorationSpec[]} = {};

    for (const visibleRange of view.visibleRanges) {
        const startLine = view.state.doc.lineAt(visibleRange.from).number;
        const endLine = view.state.doc.lineAt(visibleRange.to).number;

        for (let i = startLine; i <= endLine; i++) {
            widgets[i] = getDecosOnLine(view, i);
        }
    }

    return widgets;
}


function getDecosOnLine(view: EditorView, lineNumber: number) {
	const widgets = [];

    const line = view.state.doc.line(lineNumber);
    const docText = view.state.sliceDoc(line.from, line.to);

    const regex = /#\d{3,4}/g;

    const matches = [...docText.matchAll(regex)];

    for (const match of matches) {
        const issueId = match[0];
        const start = match.index;
        const end = match.index + match[0].length;

        widgets.push({id: issueId, start: start, end: end})
    }

	return widgets;
}


function decosByLineToDecorationSet(view: EditorView, decorationsByLine: {[lineNumber: number]: DecorationSpec[]}) {
    const allWidgets = [];

    for (const lineNumber of Object.keys(decorationsByLine)) {
        const widgets = decorationsByLine[lineNumber];
            const lineStart = view.state.doc.line(lineNumber).from;


        const offsetWidgets = widgets.map((issue => {
            issue.url = issues[issue.id]; // TODO
            issue.title = issues[issue.id]; // TODO

            return Decoration
                .replace({
                    widget: new IssueWidget(issue)
                })
                .range(issue.start + lineStart, issue.end + lineStart);
        }));

        allWidgets.push(...offsetWidgets);
    }

    return Decoration.set(allWidgets, true);
}


export const IssueAugmentationViewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    decorationsByLine: {[lineNumber: number]: DecorationSpec[]};

    constructor(view: EditorView) {
        this.decorationsByLine = getAllDecosByLine(view);
        this.decorations = decosByLineToDecorationSet(view, this.decorationsByLine);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged)  {
            this.decorationsByLine = getAllDecosByLine(update.view);
        }

        this.decorations = decosByLineToDecorationSet(update.view, this.decorationsByLine);
    }

}, { decorations: v => v.decorations, });