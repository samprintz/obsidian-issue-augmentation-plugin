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

        if (this.issueTitle) {
            const whitespace = document.createTextNode(" ");

            const a = document.createElement("a");
            a.href = this.issueUrl;
            a.textContent = this.issueTitle;
            a.style.color = "gray"; // TODO read from settings
            // a.classList.add("issue-title"); // TODO use CSS class
            span.appendChild(whitespace);
            span.appendChild(a);
        }

        return span;
    }
}
