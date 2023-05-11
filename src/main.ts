import { Plugin, TFile } from 'obsidian';
import { IssueAugmentationViewPlugin } from 'src/view-plugin';
import { IssueAugmentationPluginSettings, DEFAULT_SETTINGS, IssueAugmentationPluginSettingTab } from 'src/settings';
import { Extension } from '@codemirror/state';
import { Octokit } from '@octokit/rest';

export default class IssueAugmentationPlugin extends Plugin {
	settings: IssueAugmentationPluginSettings;
	extensions: Extension[];

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new IssueAugmentationPluginSettingTab(this.app, this));

		this.octokit = new Octokit({ auth: this.settings.githubToken });
		await this.reloadIssueIdToTitleMap();

		this.extensions = [IssueAugmentationViewPlugin.extension];
		this.registerEditorExtension(this.extensions);

		this.styleEl = document.head.createEl("style");
		this.reloadStyle();
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async reloadIssueIdToTitleMap() {
		this.issueIdToTitleMap = await this.getIssueIdToTitleMap();
	}

	async getIssueIdToTitleMap() {
		let map: {[id: string]: string} = {};

		const githubIssueMap = await this.getGitHubIssueTitles(this.settings.repoOwner,
			this.settings.repoName);
		map = Object.assign(map, githubIssueMap);

		const fileIssueMap = await this.getFileIssueTitles(this.settings.issueFilePath);
		map = Object.assign(map, fileIssueMap);

		return map;
	}

	async getGitHubIssueTitles(owner: string, repo: string) {
		const map = {};

		console.log(`Fetch issue titles from GitHub repository ${owner}/${repo}`);

		if (owner?.length && repo?.length) {
			const nrOfIssues = 3000; // TODO assuming 3.000 issues to fetch
			const issuesPerPage = 100;
			const nrPages = nrOfIssues / issuesPerPage;

			const pageNrList = [];

			for (let pageNr = 1; pageNr < nrPages; pageNr++) {
				pageNrList.push(pageNr);
			}

			const responses = await Promise.allSettled(pageNrList.map((pageNr) => {
				return this.octokit.issues.listForRepo({
					owner: owner,
					repo: repo,
					filter: "all",
					state: "all",
					per_page: issuesPerPage,
					page: pageNr,
				});
			}));

			responses.forEach(response => {
				if (response.status === "fulfilled") {
					const issues = response.value?.data ?? [];

					issues.forEach((issue) => {
						map[issue.number] = issue.title;
					});
				}
			});


			console.log("Issues fetched from GitHub");
		} else {
			// TODO Obsidian notification
			console.log(`Please specify owner and name of the GitHub repository`);
		}

		return map;
	}

	async getFileIssueTitles(path: string) {
		const map = {};

		console.log(`Read issue titles from ${path}`);

		const file = this.app.vault.getAbstractFileByPath(path);

		if (file instanceof TFile) {
			const content = await this.app.vault.cachedRead(file);
			const rows = content.split(`\n`);

			rows.forEach((row) => {
				const [id, text] = row.split(',');
				// TODO validation of ID and text
				map[id] = text;
			});

			console.log('CSV file processed');
		}

		return map;
	}

	reloadStyle() {
		this.styleEl.textContent = this.buildStyleFromSettings(this.settings);
	}

	buildStyleFromSettings(settings: NLSyntaxHighlightPluginSettings) {
		return `.issue-title { color: ${settings.titleColor} }`;
	}

	reloadEditorExtensions() {
		this.extensions.pop();
		this.app.workspace.updateOptions();
		this.extensions.push(IssueAugmentationViewPlugin.extension);
		this.app.workspace.updateOptions();
	}
}
