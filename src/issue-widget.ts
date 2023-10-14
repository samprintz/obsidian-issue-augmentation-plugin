import { WidgetType } from "@codemirror/view";

export class IssueWidget extends WidgetType {
    constructor(issue) {
        super();
        this.issueId = issue.id;
        this.issueUrl = issue.url;
        this.issueTitle = issue.title;
        this.broken = issue.broken;
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement("span");

        if (!this.broken) {
            const whitespace = document.createTextNode(" ");

            const a = document.createElement("a");
            a.href = this.issueUrl;
            a.textContent = this.issueTitle;
            a.classList.add("issue-title");

            span.appendChild(whitespace);
            span.appendChild(a);
        } else {
            const warning = document.createTextNode("?")
            span.classList.add("invalid-issue-id");
            span.appendChild(warning)
        }

        return span;
    }
}
