import { Plugin } from 'obsidian';
import { IssueAugmentationViewPlugin } from 'view-plugin';
import { IssueAugmentationPluginSettings, DEFAULT_SETTINGS, IssueAugmentationPluginSettingTab } from 'settings';
import { Extension } from '@codemirror/state';
import fs from 'fs';

export default class IssueAugmentationPlugin extends Plugin {
	settings: IssueAugmentationPluginSettings;
	extensions: Extension[];

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new IssueAugmentationPluginSettingTab(this.app, this));

		await this.loadIssueIdToTitleMap();

		this.extensions = [IssueAugmentationViewPlugin.extension];
		this.registerEditorExtension(this.extensions);
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async loadIssueIdToTitleMap() {
		const map: {[id: string]: string} = {};

		// 1. Get issue titles from GitHub
		// TODO implement GitHub API

		// 2. Get issue titles from file
		const path = app.vault.adapter.getBasePath() + "/" + this.settings.issueFilePath;
		console.log(`Read issue map from ${path}`);

		const data = await fs.promises.readFile(path, 'utf-8');

		const rows = data.trim().split('\n');
		rows.forEach((row) => {
			const [id, text] = row.split(',');
			// TODO validation of ID and text
			map[id] = text;
		});

		this.issueIdToTitleMap = map;
		console.log('CSV file successfully processed');
	}

	reloadEditorExtensions() {
		this.extensions.pop();
		this.app.workspace.updateOptions();
		this.extensions.push(IssueAugmentationViewPlugin.extension);
		this.app.workspace.updateOptions();
	}
}
