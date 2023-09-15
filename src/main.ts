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
			this.settings.repoNames);
		map = Object.assign(map, githubIssueMap);

		const fileIssueMap = await this.getFileIssueTitles(this.settings.issueFilePath);
		map = Object.assign(map, fileIssueMap);

		return map;
	}

	async getGitHubIssueTitles(owner: string, repos: string[]) {
		const map = {};

		const repositoryIssueCounts = await this.getRepositoryIssueCounts(owner, repos);

		if (owner?.length && repos?.length) {
			for (const repo of repos.filter(repo => repo?.length)) {
				console.log(`Fetch issue titles from GitHub repository ${owner}/${repo}`);

				map[repo] = {};

				const nrOfIssues = repositoryIssueCounts[repo] ?? 0;
				const issuesPerPage = 100;
				const nrPages = nrOfIssues / issuesPerPage;

				const pageNrList = [];

				for (let pageNr = 1; pageNr < nrPages; pageNr++) {
					pageNrList.push(pageNr);
				}

				const responses = await Promise.allSettled(pageNrList.map((pageNr) => {
					return this.octokit.issues.listForRepo({
						owner,
						repo,
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
							map[repo][issue.number] = issue.title;
						});
					}
				});
			}

			console.log("Issues fetched from GitHub");
		} else {
			// TODO Obsidian notification
			console.log(`Please specify owner and name of the GitHub repository`);
		}

		return map;
	}

	async getRepositoryIssueCounts(owner: string, repositories: string[]): Promise<Record<string, number>> {
		const responsesWithRepo = await Promise.allSettled(repositories.map((repo) => {
			return this.octokit.search.issuesAndPullRequests({
				q: `owner:${owner}+repo:${repo}`,
				owner,
				repo,
				per_page: 1,
				page: 1,
			})
			.then((response) => ({ repo, response }));
		}));

		return responsesWithRepo.reduce((repositoryIssueCounts, responseWithRepo) => {
			if (responseWithRepo.status === "fulfilled") {
				const { repo, response } = responseWithRepo.value;
				repositoryIssueCounts[repo] = response.data?.total_count;
			}

			return repositoryIssueCounts;
		}, {})
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
