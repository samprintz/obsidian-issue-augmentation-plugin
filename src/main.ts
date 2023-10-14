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
		for (const key in fileIssueMap) {
			Object.assign(map[key], fileIssueMap[key]);
		}

		return map;
	}

	async getGitHubIssueTitles(owner: string, repos: string[]) {
		const map = {};

		if (owner?.length) {
			if (!repos || repos.length === 0) {
				console.log(`No GitHub repository specified in settings. Fetching all repositories.`);
				repos = await this.getRepositories(owner);
			}

			const repositoryIssueCounts = await this.getRepositoryIssueCounts(owner, repos);

			if (repos?.length) {
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
				console.warn(`No GitHub repository found`);
			}
		} else {
			console.warn(`No GitHub repository owner specified in settings`);
		}

		return map;
	}

	async getRepositories(owner: string): Promise<string[]> {
		// public repositories only
		//const response = await this.octokit.repos.listForUser({ username: owner });
		//return response?.data?.map(r => r.name);

		// public and private repositories
		const response = await this.octokit.search.repos({ q: `user:${owner}` });
		return response?.data?.items?.map(r => r.name);
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

		if (path?.length) {
			const defaultRepository = this.settings.defaultRepoName;
			const regex = /(([a-zA-Z0-9\\.\-_]*)#)?(\d{1,5}),(.*)/g;

			console.log(`Read issue titles from ${path}`);

			const file = this.app.vault.getAbstractFileByPath(path);

			if (file instanceof TFile) {
				const content = await this.app.vault.cachedRead(file);
				const rows = content.split(`\n`);

				let rowIndex = 0;
				rows.forEach((row) => {
					rowIndex++;
					regex.lastIndex = 0; // reset lastIndex for each row
					const match = regex.exec(row);

					if (match) {
						const hasValidRepository = match[2] || defaultRepository;

						if (hasValidRepository) {
							const repository = match[2] ?? defaultRepository;
							const issueId = match[3];
							const text = match[4];

							if (!map.hasOwnProperty(repository)) {
								map[repository] = {};
							}

							map[repository][issueId] = text;
						} else {
							console.warn(`Skipping row ${rowIndex} in CSV without repository: ${row}. Specify repository or enter a default repository in settings.`);
						}
					} else {
						console.warn(`Skipping invalid row ${rowIndex} in CSV: ${row}`);
					}
				});

				console.log('CSV file processed');
			}
		} else {
			console.warn(`No GitHub issue title map file specified in settings`);
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
