import { WidgetType } from "@codemirror/view";

export class IssueWidget extends WidgetType {
    constructor(issue) {
        super();
        this.issueId = issue.id;
        this.issueUrl = issue.url;
        this.issueTitle = issue.title;
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement("span");
        const a = document.createElement("a");
        a.href = "https://example.com"; // TODO read from settings
        a.textContent = this.issueId;

        const textSpan = document.createElement("span");
        textSpan.style = "color: red"; // TODO read from settings
        const text = document.createTextNode(` ${this.issueTitle}`);
        textSpan.appendChild(text);
        // textSpan.classList.add("issue-title"); // TODO use CSS class
        textSpan.style.color = "gray";

        span.appendChild(a);
        span.appendChild(textSpan);

        return span;
    }
}
