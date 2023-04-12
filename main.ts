import { Plugin } from 'obsidian';
import { IssueAugmentationViewPlugin } from 'view-plugin';
import { IssueAugmentationPluginSettings, DEFAULT_SETTINGS, IssueAugmentationPluginSettingTab } from 'settings';
import { Extension } from '@codemirror/state';
import fs from 'fs';
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

		const path = app.vault.adapter.getBasePath() + "/" + this.settings.issueFilePath;
		const fileIssueMap = await this.getFileIssueTitles(path);
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

			for (let pageNr = 1; pageNr < nrPages; pageNr++) {
				const response = await this.octokit.issues.listForRepo({
					owner: owner,
					repo: repo,
					filter: "all",
					state: "all",
					per_page: issuesPerPage,
					page: pageNr,
				});

				const issues = response.data;

				issues.forEach((issue) => {
					map[issue.number] = issue.title;
				});
			}

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

		const data = await fs.promises.readFile(path, 'utf-8');

		const rows = data.trim().split('\n');
		rows.forEach((row) => {
			const [id, text] = row.split(',');
			// TODO validation of ID and text
			map[id] = text;
		});

		console.log('CSV file processed');

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
