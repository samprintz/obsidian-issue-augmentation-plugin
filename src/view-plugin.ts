import { EditorView, ViewUpdate, Decoration, DecorationSet, ViewPlugin } from '@codemirror/view';
import { IssueWidget } from 'src/issue-widget'


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

    const regex = /([a-zA-Z0-9\\.\-_]*)#(\d{1,5})/g;

    const matches = [...docText.matchAll(regex)];

    for (const match of matches) {
        const repository = match[1];
        const issueId = match[2];
        const start = match.index;
        const end = match.index + match[0].length;

        widgets.push({id: issueId, repository, start, end})
    }

	return widgets;
}


function decosByLineToDecorationSet(view: EditorView, decorationsByLine: {[lineNumber: number]: DecorationSpec[]}) {
    const allWidgets = [];

    // TODO better way to access settings/plugin properties
    const plugin = window.app.plugins.plugins['github-issue-augmentation'];

    const urlPrefix = plugin.settings.urlPrefix.endsWith("/")
            ? plugin.settings.urlPrefix
            : plugin.settings.urlPrefix + "/";
    const defaultRepository = plugin.settings.defaultRepoName;
    const repositoryOwner = plugin.settings.repoOwner;

    for (const lineNumber of Object.keys(decorationsByLine)) {
        const widgets = decorationsByLine[lineNumber];
        const lineStart = view.state.doc.line(lineNumber).from;

        const offsetWidgets = widgets
            .map((issue) => {
                // TODO ignore if no default repository is specified in settings
                issue.repository = issue.repository?.length
                        ? issue.repository
                        : defaultRepository;
                return issue;
            })
            .filter(issue => plugin.issueIdToTitleMap.hasOwnProperty(issue.repository)) // invalid repository name // TODO highlight as invalid
            .map((issue => {
                issue.url = `${urlPrefix}${repositoryOwner}/${issue.repository}/issues/${issue.id}`;
                issue.title = plugin.issueIdToTitleMap[issue.repository][issue.id];

                return Decoration
                    .widget({
                        widget: new IssueWidget(issue)
                    })
                    .range(issue.end + lineStart);
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
